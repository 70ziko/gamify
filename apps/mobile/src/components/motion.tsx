import * as Haptics from 'expo-haptics';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, Easing, FadeIn, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

// Motion vocabulary for the whole app. Every animation picks its curve, duration and spring from here.
//
// - Press feedback is near-imperceptible (scale 0.97, 120ms) because it happens dozens of times a day.
// - Entering and exiting use `ease.out`; things moving across the screen use `ease.inOut`. Never ease-in on UI.
// - A finger-driven value settles with a spring and keeps the gesture's velocity. Overshoot (`spring.pop`) is
//   reserved for rare wins: finishing a step, a quest, a level.
// - Tab switches don't animate. Content the user waited for (first load, AI results) may stagger in, once.
// - Reduced motion keeps fades and color changes and drops translation, scale and loops (`useReducedMotion`).

export const ease = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
};

// The same curves for Reanimated CSS transitions and animations (`transitionTimingFunction`,
// `animationTimingFunction`). Native accepts only keywords or `cubicBezier()`, not `'cubic-bezier(...)'` strings.
export const cssEase = {
  out: cubicBezier(0.23, 1, 0.32, 1),
  inOut: cubicBezier(0.77, 0, 0.175, 1),
  sheet: cubicBezier(0.32, 0.72, 0, 1),
};

export const duration = {
  press: 120,
  state: 180,
  enter: 240,
  exit: 190,
  fill: 450,
  stagger: 40,
};

export const spring = {
  settle: { duration: 400, dampingRatio: 1 },
  snap: { duration: 400, dampingRatio: 0.8 },
  sheet: { duration: 300, dampingRatio: 0.8 },
  pop: { duration: 450, dampingRatio: 0.55 },
};

// One haptic per user action, fired in the same frame as its visual. From a worklet: `scheduleOnRN(haptic.light)`.
const native = Platform.OS === 'ios' || Platform.OS === 'android';
const quiet = () => undefined;
export const haptic = {
  select: () => { if (native) Haptics.selectionAsync().catch(quiet); },
  light: () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(quiet); },
  medium: () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(quiet); },
  success: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(quiet); },
  error: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(quiet); },
};

// Staggered entrance for a block of content, from 12pt below. Fade-only under reduced motion.
// Build it in useMemo (or module scope): layout-animation builders rebuilt in render cost every render.
// Reanimated skips System-mode animations entirely under reduced motion, so the fade opts out to still play.
export function enterUp(index = 0, reduced = false) {
  const delay = index * duration.stagger;
  return reduced
    ? FadeIn.duration(duration.enter).delay(delay).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(duration.enter).delay(delay).easing(ease.out).withInitialValues({ transform: [{ translateY: 12 }] });
}

// Content that arrives after a loading state (the screen slid in before its data) fades in instead of popping.
const contentFade = FadeIn.duration(duration.state).easing(ease.out).reduceMotion(ReduceMotion.Never);
export function ContentIn({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={contentFade} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Pressable that sinks slightly under the finger: feedback on press-in, commit on press-out.
export function PressableScale({
  scale = 0.97,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PropsWithChildren<Omit<PressableProps, 'style'> & { scale?: number; style?: StyleProp<ViewStyle> }>) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const feedback: ViewStyle = reduced ? { opacity: pressed ? 0.8 : 1 } : { transform: [{ scale: pressed ? scale : 1 }] };
  return (
    <AnimatedPressable
      pressRetentionOffset={16}
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        style,
        feedback,
        // Selected and tinted states (a picked pill, a revealed answer) cross-fade their colors instead of snapping.
        {
          transitionProperty: ['transform', 'opacity', 'backgroundColor', 'borderColor'],
          transitionDuration: [duration.press, duration.press, duration.state, duration.state],
          transitionTimingFunction: cssEase.out,
        },
      ]}>
      {children}
    </AnimatedPressable>
  );
}

// Remembers values across screen mounts for this app session, so a screen can animate what changed while the user
// was elsewhere (XP gained on the step screen fills the bar when Home mounts again). Returns the last value seen for
// `key`, or `value` itself the first time.
const seen = new Map<string, unknown>();
export function useSeen<T>(key: string, value: T): T {
  const [previous] = useState(() => (seen.has(key) ? (seen.get(key) as T) : value));
  useEffect(() => {
    seen.set(key, value);
  }, [key, value]);
  return previous;
}

// True only the first time a screen with this key mounts in this app session. Entrances that celebrate content
// arriving play once; switching back to a tab shows it already in place.
const played = new Set<string>();
export function useFirstTime(key: string) {
  const [first] = useState(() => !played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first;
}

export function forgetSeen() {
  seen.clear();
  played.clear();
}
