import { type ReactNode, useMemo } from 'react';
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { ease, haptic, spring } from '@/components/motion';

// Where a flick would come to rest if the finger kept decelerating (Apple's exponential decay), so a fast short
// swipe commits and a slow long drag doesn't.
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// The further past an edge, the less the element follows.
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

const CLOSE_MS = 220;
const DISMISS_AT = 0.4;

type SpringConfig = { duration: number; dampingRatio: number };

type SheetOptions = {
  onDismiss: () => void;
  openMs?: number;
  // Distance past the sheet's own height that it must travel to be fully hidden (a home-indicator strip it covers).
  below?: number;
  snapBack?: SpringConfig;
};

// One value drives the sheet: `y`, its offset from the resting position. The backdrop derives from it, so drag,
// open and close all stay in sync. Reduced motion keeps the drag (the finger moves it) but opens and closes with a fade.
function useSheetMotion({ onDismiss, openMs = 300, below = 0, snapBack = spring.sheet }: SheetOptions) {
  const reduced = useReducedMotion();
  const { height: screen } = useWindowDimensions();
  const height = useSharedValue(0);
  const y = useSharedValue(reduced ? 0 : screen); // off screen until the sheet has measured itself
  const fade = useSharedValue(reduced ? 0 : 1);
  const start = useSharedValue(0);
  const closing = useSharedValue(false);

  const { pan, open, hide } = useMemo(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onDismiss);
    };
    // `velocity` is null for a tap or Android back: slide away on a curve. A release hands its velocity to the spring.
    const hide = (velocity: number | null) => {
      'worklet';
      if (closing.get()) return;
      closing.set(true);
      const hidden = height.get() + below;
      if (reduced) fade.set(withTiming(0, { duration: CLOSE_MS, easing: ease.out, reduceMotion: ReduceMotion.Never }, done));
      else if (velocity === null) y.set(withTiming(hidden, { duration: CLOSE_MS, easing: ease.out }, done));
      else y.set(withSpring(hidden, { ...spring.sheet, velocity, overshootClamping: true }, done));
    };
    const open = (measured: number) => {
      'worklet';
      const first = height.get() === 0;
      height.set(measured);
      if (!first || closing.get()) return;
      if (reduced) {
        fade.set(withTiming(1, { duration: openMs, easing: ease.out, reduceMotion: ReduceMotion.Never }));
      } else {
        y.set(measured + below);
        y.set(withTiming(0, { duration: openMs, easing: ease.sheet }));
      }
    };
    const pan = Gesture.Pan()
      .activeOffsetY([-10, 10])
      .onStart(() => {
        // Grabbing mid-open continues from where the eye last saw the sheet.
        start.set(y.get());
      })
      .onUpdate((event) => {
        if (closing.get()) return;
        const next = start.get() + event.translationY;
        y.set(next >= 0 ? next : rubberband(next, height.get()));
      })
      .onEnd((event) => {
        if (closing.get()) return;
        if (y.get() + project(event.velocityY) > height.get() * DISMISS_AT) {
          hide(event.velocityY);
        } else {
          y.set(withSpring(0, { ...snapBack, velocity: event.velocityY }));
          scheduleOnRN(haptic.light);
        }
      });
    return { pan, open, hide };
  }, [onDismiss, openMs, below, snapBack, reduced, height, y, fade, start, closing]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: y.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: fade.get() * interpolate(y.get(), [0, Math.max(height.get() + below, 1)], [1, 0], Extrapolation.CLAMP),
  }));

  return {
    pan,
    sheetStyle,
    backdropStyle,
    onLayout: (event: LayoutChangeEvent) => scheduleOnUI(open, event.nativeEvent.layout.height),
    close: () => scheduleOnUI(hide, null),
  };
}

type Motion = ReturnType<typeof useSheetMotion>;

function SheetBody({ motion, color, style, children }: { motion: Motion; color: string; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <GestureDetector gesture={motion.pan}>
      <Animated.View onLayout={motion.onLayout} style={[style, motion.sheetStyle]}>
        {/* The sheet's color continues below its bottom edge, so pulling it up past rest never opens a gap. */}
        <View style={[styles.underlay, { backgroundColor: color }]} />
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

type ModalSheetProps = {
  onClose: () => void;
  color: string;
  style?: StyleProp<ViewStyle>;
  // Receives `close`, which slides the sheet away and then calls `onClose`.
  children: (close: () => void) => ReactNode;
};

// A bottom sheet in a transparent Modal (so it covers the bottom nav) that rises from its own height when shown.
// Drag it down, tap the backdrop or press Android back to dismiss. Mounting per open gives each one fresh values.
export function SheetModal({ visible, ...props }: ModalSheetProps & { visible: boolean }) {
  return visible ? <ModalSheet {...props} /> : null;
}

function ModalSheet({ onClose, color, style, children }: ModalSheetProps) {
  const motion = useSheetMotion({ onDismiss: onClose });
  return (
    <Modal visible transparent animationType="none" onRequestClose={motion.close}>
      {/* Gestures inside an RN Modal need their own root. */}
      <GestureHandlerRootView style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, motion.backdropStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={motion.close} />
        </Animated.View>
        <SheetBody motion={motion} color={color} style={style}>
          {children(motion.close)}
        </SheetBody>
      </GestureHandlerRootView>
    </Modal>
  );
}

// A sheet that is part of a screen: rises on mount, and a drag down past the threshold calls `onDismiss`.
export function SheetPanel({
  onDismiss,
  below,
  color,
  style,
  children,
}: {
  onDismiss: () => void;
  below?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const motion = useSheetMotion({ onDismiss, openMs: 320, below, snapBack: spring.snap });
  return (
    <SheetBody motion={motion} color={color} style={style}>
      {children}
    </SheetBody>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(12, 8, 16, 0.62)' },
  underlay: { position: 'absolute', left: 0, right: 0, top: '100%', height: 480, pointerEvents: 'none' },
});
