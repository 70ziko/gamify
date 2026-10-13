import { type PropsWithChildren, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  type CSSTransitionProperties,
  type EntryExitAnimationFunction,
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/gamify-ui';
import { cssEase, duration, ease, enterUp, haptic, spring } from '@/components/motion';

// Motion for onboarding, Explore, Course, League, Profile and Settings, built on the vocabulary in motion.tsx.
// Fades stay under reduced motion, so their builders and timings opt out of Reanimated's system skip.

type Spring = (typeof spring)[keyof typeof spring];

export const fadeIn = FadeIn.duration(duration.state).reduceMotion(ReduceMotion.Never);
const listIn = FadeIn.duration(duration.state).reduceMotion(ReduceMotion.Never);
const listOut = FadeOut.duration(duration.press).reduceMotion(ReduceMotion.Never);
// A load that finishes within 150ms never shows a spinner.
const spinnerIn = FadeIn.delay(150).duration(duration.state).reduceMotion(ReduceMotion.Never);

export function DelayedSpinner({ color }: { color: string }) {
  return (
    <Animated.View entering={spinnerIn}>
      <ActivityIndicator color={color} />
    </Animated.View>
  );
}

// Fades in from `from` scale on a spring. Never starts below 0.6 so it reads as a pop, not a grow from nothing.
function popIn(delay: number, from: number, config: Spring, reduced: boolean): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const opacity = withDelay(delay, withTiming(1, { duration: duration.press, easing: ease.out, reduceMotion: ReduceMotion.Never }), ReduceMotion.Never);
    if (reduced) return { initialValues: { opacity: 0 }, animations: { opacity } };
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: { opacity, transform: [{ scale: withDelay(delay, withSpring(1, config)) }] },
    };
  };
}

// Like popIn on a short ease-out timing, for small marks that settle without overshoot.
function growIn(delay: number, from: number, ms: number, reduced: boolean): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const timing = { duration: ms, easing: ease.out, reduceMotion: ReduceMotion.Never };
    const opacity = withDelay(delay, withTiming(1, timing), ReduceMotion.Never);
    if (reduced) return { initialValues: { opacity: 0 }, animations: { opacity } };
    return {
      initialValues: { opacity: 0, transform: [{ scale: from }] },
      animations: { opacity, transform: [{ scale: withDelay(delay, withTiming(1, timing)) }] },
    };
  };
}

// `count` staggered enterUp entrances starting at `start` ms, or no entrances when `enabled` is false (a tab
// revisited this session shows its content in place).
export function useEntrances(enabled: boolean, count: number, start = 0, stagger: number = duration.stagger) {
  const reduced = useReducedMotion();
  return useMemo(
    () => Array.from({ length: count }, (_, index) => (enabled ? enterUp(0, reduced).delay(start + index * stagger) : undefined)),
    [enabled, reduced, count, start, stagger],
  );
}

export function usePopIn(enabled: boolean, delay: number, from: number, config: keyof typeof spring) {
  const reduced = useReducedMotion();
  return useMemo(() => (enabled ? popIn(delay, from, spring[config], reduced) : undefined), [enabled, delay, from, config, reduced]);
}

// Cells of a wrapping grid fade and grow in along diagonals, 8ms apart, so the wave stays well under 300ms.
export function useGridEntrance(enabled: boolean, count: number, columns: number, start = 0) {
  const reduced = useReducedMotion();
  return useMemo(
    () =>
      Array.from({ length: count }, (_, index) =>
        enabled ? growIn(start + ((index % columns) + Math.floor(index / columns)) * 8, 0.85, 150, reduced) : undefined,
      ),
    [enabled, count, columns, start, reduced],
  );
}

// Errors arrive with a short shake and one error haptic. Key it on the message so each new error replays.
const shakeFrames = {
  '0%': { opacity: 0, transform: [{ translateX: 0 }] },
  '20%': { opacity: 1, transform: [{ translateX: 6 }] },
  '40%': { transform: [{ translateX: -6 }] },
  '60%': { transform: [{ translateX: 4 }] },
  '80%': { transform: [{ translateX: -2 }] },
  '100%': { opacity: 1, transform: [{ translateX: 0 }] },
};
const fadeFrames = { from: { opacity: 0 }, to: { opacity: 1 } };

export function ShakeIn({ message, children }: PropsWithChildren<{ message: string }>) {
  const reduced = useReducedMotion();
  useEffect(() => {
    haptic.error();
  }, [message]);
  return (
    <Animated.View
      style={{
        animationName: reduced ? fadeFrames : shakeFrames,
        animationDuration: reduced ? duration.state : duration.enter,
        animationTimingFunction: 'ease-in-out',
        animationFillMode: 'both',
      }}>
      {children}
    </Animated.View>
  );
}

// Welcome's dashed halo: scales up into place, then turns once every 24s for as long as the screen is open.
const haloFrames = {
  from: { opacity: 0, transform: [{ scale: 0.9 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};
const spinFrames = { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } };

export function SpinningHalo({ size, color }: { size: number; color: string }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        animationName: reduced ? fadeFrames : haloFrames,
        animationDuration: 300,
        animationTimingFunction: cssEase.out,
        animationFillMode: 'both',
      }}>
      <Animated.View
        style={[
          motionStyles.halo,
          { borderColor: color },
          reduced ? null : { animationName: spinFrames, animationDuration: 24_000, animationIterationCount: 'infinite', animationTimingFunction: 'linear' },
        ]}
      />
    </Animated.View>
  );
}

// A badge that pops in after `delay` and then bobs ±4pt. `sink` starts it moving down instead of up, so two
// badges with different periods never bob in step.
const bobUp = { from: { transform: [{ translateY: -4 }] }, to: { transform: [{ translateY: 4 }] } };
const bobDown = { from: { transform: [{ translateY: 4 }] }, to: { transform: [{ translateY: -4 }] } };

export function FloatingBadge({ style, delay, period, sink = false, children }: PropsWithChildren<{ style: StyleProp<ViewStyle>; delay: number; period: number; sink?: boolean }>) {
  const reduced = useReducedMotion();
  const entering = useMemo(() => popIn(delay, 0.6, spring.pop, reduced), [delay, reduced]);
  return (
    <Animated.View
      style={[
        style,
        reduced
          ? null
          : { animationName: sink ? bobDown : bobUp, animationDuration: period / 2, animationDirection: 'alternate', animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' },
      ]}>
      <Animated.View entering={entering}>{children}</Animated.View>
    </Animated.View>
  );
}

// Selected-state colors cross-fade instead of snapping.
export const colorTransition: CSSTransitionProperties<ViewStyle> = {
  transitionProperty: ['backgroundColor', 'borderColor'],
  transitionDuration: duration.state,
  transitionTimingFunction: cssEase.out,
};

// Renders `overlay` on top of `children` and fades it in while `on`: a gradient over a plain tile, or text in its
// selected color over the same text in its resting color.
export function CrossFade({ on, overlay, style, children }: PropsWithChildren<{ on: boolean; overlay: ReactNode; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: on ? 1 : 0, transitionProperty: 'opacity', transitionDuration: duration.state, transitionTimingFunction: cssEase.out }]}>
        {overlay}
      </Animated.View>
    </View>
  );
}

// A check mark that pops in when it appears. The one already shown when the screen mounts stays still.
export function CheckPop({ visible, children }: PropsWithChildren<{ visible: boolean }>) {
  const reduced = useReducedMotion();
  const entering = useMemo(() => growIn(0, 0.6, 200, reduced), [reduced]);
  return <LayoutAnimationConfig skipEntering>{visible ? <Animated.View entering={entering}>{children}</Animated.View> : null}</LayoutAnimationConfig>;
}

// Swaps a displayed value: the old one leaves while the new one arrives. `roll` slides numbers like an odometer
// (up when the value grows, down when it shrinks); `fade` cross-fades. Pass `initial` to play the change from a
// value seen earlier as the component mounts.
const rollFrames = {
  upIn: { from: { opacity: 0, transform: [{ translateY: 10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
  upOut: { from: { opacity: 1, transform: [{ translateY: 0 }] }, to: { opacity: 0, transform: [{ translateY: -10 }] } },
  downIn: { from: { opacity: 0, transform: [{ translateY: -10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
  downOut: { from: { opacity: 1, transform: [{ translateY: 0 }] }, to: { opacity: 0, transform: [{ translateY: 10 }] } },
};
const fadeOutFrames = { from: { opacity: 1 }, to: { opacity: 0 } };

export function Swap<T extends string | number>({
  value,
  initial,
  render,
  motion = 'fade',
  align = 'left',
  style,
}: {
  value: T;
  initial?: T;
  render: (value: T) => ReactNode;
  motion?: 'roll' | 'fade';
  align?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [swap, setSwap] = useState(() => ({ current: value, previous: initial ?? value, count: initial !== undefined && initial !== value ? 1 : 0 }));
  if (swap.current !== value) setSwap({ current: value, previous: swap.current, count: swap.count + 1 });
  const roll = motion === 'roll' && !reduced;
  const down = typeof value === 'number' && typeof swap.previous === 'number' && value < swap.previous;
  const time = { animationDuration: roll ? 160 : duration.state, animationTimingFunction: cssEase.out, animationFillMode: 'both' as const };
  return (
    <View style={[motion === 'roll' ? motionStyles.clip : null, style]}>
      <Animated.View key={`in${swap.count}`} style={swap.count ? { ...time, animationName: roll ? (down ? rollFrames.downIn : rollFrames.upIn) : fadeFrames } : null}>
        {render(value)}
      </Animated.View>
      {swap.count ? (
        <Animated.View
          key={`out${swap.count}`}
          pointerEvents="none"
          style={[
            motionStyles.out,
            align === 'right' ? { right: 0 } : { left: 0 },
            { ...time, animationDuration: roll ? 160 : duration.press, animationName: roll ? (down ? rollFrames.downOut : rollFrames.upOut) : fadeOutFrames },
          ]}>
          {render(swap.previous)}
        </Animated.View>
      ) : null}
    </View>
  );
}

// A list that cross-fades when `id` changes (a new filter or search). Leaving the screen skips the fade-out, so the
// old list never lingers over the next screen.
export function KeyedFade({ id, animate, children }: PropsWithChildren<{ id: string; animate: boolean }>) {
  return (
    <LayoutAnimationConfig skipExiting>
      <Animated.View key={id} entering={animate ? listIn : undefined} exiting={listOut} style={motionStyles.list}>
        {children}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

// Dims content that is about to be replaced. The dim waits 150ms, so a fast load swaps without ever dimming.
export function Dim({ dimmed, children }: PropsWithChildren<{ dimmed: boolean }>) {
  return (
    <Animated.View
      style={{ opacity: dimmed ? 0.55 : 1, transitionProperty: 'opacity', transitionDuration: duration.state, transitionDelay: dimmed ? 150 : 0, transitionTimingFunction: cssEase.out }}>
      {children}
    </Animated.View>
  );
}

// Outline drawn over a card's own border (`inset` = that border's width), so focus never shifts layout.
export function FocusRing({ visible, color, radius, inset = 1 }: { visible: boolean; color: string; radius: number; inset?: number }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        motionStyles.ring,
        { top: -inset, left: -inset, right: -inset, bottom: -inset, borderRadius: radius, borderColor: color, opacity: visible ? 1 : 0 },
        { transitionProperty: 'opacity', transitionDuration: 150, transitionTimingFunction: cssEase.out },
      ]}
    />
  );
}

// Tints a card's border and background with `color` once (600ms), e.g. when the user climbed a rank.
const flashFrames = { '0%': { opacity: 0 }, '25%': { opacity: 1 }, '100%': { opacity: 0 } };

export function FlashRing({ play, color, radius, inset = 1 }: { play: boolean; color: string; radius: number; inset?: number }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        motionStyles.ring,
        { top: -inset, left: -inset, right: -inset, bottom: -inset, borderRadius: radius, borderWidth: inset, borderColor: color, backgroundColor: `${color}1F`, opacity: 0 },
        play ? { animationName: flashFrames, animationDuration: 600, animationTimingFunction: cssEase.out } : null,
      ]}
    />
  );
}

// The face of a 3D key: sinks into its lip under the finger and comes back up on release.
export function KeyFace({ pressed, depth = 4, children }: PropsWithChildren<{ pressed: boolean; depth?: number }>) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        reduced ? { opacity: pressed ? 0.85 : 1 } : { transform: [{ translateY: pressed ? depth : 0 }] },
        { transitionProperty: ['transform', 'opacity'], transitionDuration: pressed ? 100 : 140, transitionTimingFunction: cssEase.out },
      ]}>
      {children}
    </Animated.View>
  );
}

// Quarter-turns its content while `turned` (a "+" that answers the press).
export function Turn({ turned, style, children }: PropsWithChildren<{ turned: boolean; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[style, { transform: [{ rotate: turned && !reduced ? '90deg' : '0deg' }], transitionProperty: 'transform', transitionDuration: duration.state, transitionTimingFunction: cssEase.out }]}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A list row whose background lights up with `highlight` while pressed.
export function HighlightPressable({
  highlight,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: PropsWithChildren<Omit<PressableProps, 'style' | 'children'> & { highlight: string; style?: StyleProp<ViewStyle> }>) {
  const [pressed, setPressed] = useState(false);
  return (
    <AnimatedPressable
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
        // Fading from the same color at zero alpha keeps the fade from passing through gray.
        { backgroundColor: pressed ? highlight : `${highlight}00` },
        { transitionProperty: 'backgroundColor', transitionDuration: duration.press, transitionTimingFunction: cssEase.out },
      ]}>
      {children}
    </AnimatedPressable>
  );
}

// Star `index` of a rating row. When the rating changes, every star up to it pops in turn, 40ms apart, as its
// color fills in.
const STAR_STAGGER = 40;

export function RatingStar({ index, rating, on, off, size }: { index: number; rating: number; on: string; off: string; size: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const filled = index <= rating;
  const delay = (index - 1) * STAR_STAGGER;
  useEffect(() => {
    if (!filled || reduced) return;
    scale.set(withDelay(delay, withSequence(withTiming(0.7, { duration: 0 }), withTiming(1.15, { duration: 110, easing: ease.out }), withSpring(1, spring.pop))));
  }, [rating, filled, reduced, delay, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={pop}>
      <Icon name="star" color={off} size={size} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: filled ? 1 : 0, transitionProperty: 'opacity', transitionDuration: duration.state, transitionDelay: filled ? delay : 0, transitionTimingFunction: cssEase.out },
        ]}>
        <Icon name="star" color={on} size={size} />
      </Animated.View>
    </Animated.View>
  );
}

const motionStyles = StyleSheet.create({
  halo: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 999 },
  clip: { overflow: 'hidden' },
  out: { position: 'absolute', top: 0 },
  list: { gap: 8 },
  ring: { position: 'absolute', borderWidth: 1.5 },
});
