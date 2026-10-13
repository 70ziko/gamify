import { type PropsWithChildren, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  css,
  type CSSTransitionProperties,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  Keyframe,
  LayoutAnimationConfig,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { GText, Icon, type Palette } from '@/components/gamify-ui';
import { cssEase, duration, ease, enterUp, haptic, PressableScale, spring } from '@/components/motion';

// Motion for the creation flow (sheet, AI prompt, generating, review, manual) and the streak sheet.

const never = ReduceMotion.Never;

// Siblings glide when a card above them grows or shrinks. Translation, so Reanimated skips it under reduced motion.
export const reflow = LinearTransition.duration(200).easing(ease.inOut);

function riseIn(delay: number, ms: number, rise: number, reduced: boolean) {
  return reduced
    ? FadeIn.duration(ms).delay(delay).reduceMotion(never)
    : FadeInDown.duration(ms).delay(delay).easing(ease.out).withInitialValues({ transform: [{ translateY: rise }] });
}

// Entrance builders for blocks that rise in `step` ms apart (built once, not per render).
export function useStagger(count: number, step: number) {
  const reduced = useReducedMotion();
  return useMemo(() => Array.from({ length: count }, (_, index) => enterUp(0, reduced).delay(index * step)), [count, step, reduced]);
}

// A block of content the user waited for, staggered by `index`; `layout` makes it glide when siblings resize.
export function Enter({ index, layout = false, style, children }: PropsWithChildren<{ index: number; layout?: boolean; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const entering = useMemo(() => enterUp(index, reduced), [index, reduced]);
  return <Animated.View entering={entering} layout={layout ? reflow : undefined} style={style}>{children}</Animated.View>;
}

// Children mounted with this subtree skip their entrances; ones mounted later play theirs.
export function SkipEnterOnMount({ children }: { children: ReactNode }) {
  return <LayoutAnimationConfig skipEntering>{children}</LayoutAnimationConfig>;
}

// A unit's step list: items rise in 20ms apart when it opens, the whole list fades when it closes.
const unitListExit = FadeOut.duration(120).reduceMotion(never);
export function UnitSteps({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <Animated.View exiting={unitListExit} style={style}>{children}</Animated.View>;
}
export function UnitStep({ index, style, children }: PropsWithChildren<{ index: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const entering = useMemo(() => riseIn(index * 20, duration.state, 8, reduced), [index, reduced]);
  return <Animated.View entering={entering} style={style}>{children}</Animated.View>;
}

// A row the user added (or AI suggested, `stagger` apart): rises in, sinks slightly as it fades out, and the rest reflow.
const rowExit = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.97 }], easing: ease.out },
}).duration(150);
const rowExitReduced = FadeOut.duration(150).reduceMotion(never);
export function ListRow({ stagger = 0, children }: PropsWithChildren<{ stagger?: number }>) {
  const reduced = useReducedMotion();
  const entering = useMemo(() => riseIn(stagger * duration.stagger, 200, 10, reduced), [stagger, reduced]);
  return <Animated.View entering={entering} exiting={reduced ? rowExitReduced : rowExit} layout={reflow}>{children}</Animated.View>;
}

let lastKey = 0;
// Stable keys for client-side list rows, so a removed row (not the last one) is the one that animates out.
export const newKey = () => ++lastKey;

// Pops from `from` to full size on mount with the win spring (overshoot). Fade only under reduced motion.
export function PopIn({ delay = 0, from = 0.6, style, children }: PropsWithChildren<{ delay?: number; from?: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      reduced
        ? withDelay(delay, withTiming(1, { duration: duration.state, easing: ease.out, reduceMotion: never }), never)
        : withDelay(delay, withSpring(1, spring.pop)),
    );
  }, [progress, delay, reduced]);
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: reduced ? 1 : from + (1 - from) * progress.get() }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// Settles from `from` to full size whenever `trigger` changes (not on mount). Nothing under reduced motion.
export function PopOnChange({ trigger, from = 0.85, children }: { trigger: unknown; from?: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const last = useRef(trigger);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (last.current === trigger) return;
    last.current = trigger;
    if (!reduced) scale.set(withSequence(withTiming(from, { duration: 0 }), withTiming(1, { duration: duration.state, easing: ease.out })));
  }, [trigger, from, reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

// Loops use the gentle keyword curve so they read as breathing rather than as a repeated move.
const flameFrames = css.keyframes({
  from: { transform: [{ scale: 1 }, { rotate: '-2deg' }] },
  to: { transform: [{ scale: 1.04 }, { rotate: '2deg' }] },
});
const markFrames = css.keyframes({ from: { transform: [{ scale: 1 }] }, to: { transform: [{ scale: 1.05 }] } });
export function Breathe({ kind, delay = 0, style, children }: PropsWithChildren<{ kind: 'flame' | 'mark'; delay?: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        reduced
          ? null
          : {
              animationName: kind === 'flame' ? flameFrames : markFrames,
              animationDuration: kind === 'flame' ? 1600 : 1400,
              animationDelay: delay,
              // Holds the first frame through the delay, so the loop doesn't start with a tilt jump.
              animationFillMode: 'backwards',
              animationDirection: 'alternate',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
      ]}>
      {children}
    </Animated.View>
  );
}

// A ring that turns once a second while work runs (an opacity pulse under reduced motion), and holds still otherwise.
const spinFrames = css.keyframes({ from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } });
const pulseFrames = css.keyframes({ from: { opacity: 1 }, to: { opacity: 0.4 } });
export function SpinnerRing({ running, style }: { running: boolean; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        {
          animationName: reduced ? pulseFrames : spinFrames,
          animationDuration: reduced ? 900 : 1000,
          animationTimingFunction: reduced ? 'ease-in-out' : 'linear',
          animationDirection: reduced ? 'alternate' : 'normal',
          animationIterationCount: 'infinite',
          animationPlayState: running ? 'running' : 'paused',
        },
      ]}
    />
  );
}

// Pops in on mount, `index * step` ms after its left neighbor. Fade only under reduced motion.
const appearFrames = css.keyframes({ from: { opacity: 0, transform: [{ scale: 0.85 }] }, to: { opacity: 1, transform: [{ scale: 1 }] } });
const fadeFrames = css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
export function Appear({ index, step = 35, style, children }: PropsWithChildren<{ index: number; step?: number; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        style,
        {
          animationName: reduced ? fadeFrames : appearFrames,
          animationDuration: 200,
          animationDelay: index * step,
          animationTimingFunction: cssEase.out,
          animationFillMode: 'backwards',
        },
      ]}>
      {children}
    </Animated.View>
  );
}

// One full turn when `play` turns on. Remount (key) to play it again.
export function TurnOnce({ play, children }: { play: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View style={play && !reduced ? { animationName: spinFrames, animationDuration: 500, animationTimingFunction: cssEase.out } : null}>
      {children}
    </Animated.View>
  );
}

// A border that lights up over its card and fades away. Remount (key) to flash again.
const flashFrames = css.keyframes({ '0%': { opacity: 0 }, '20%': { opacity: 1 }, '100%': { opacity: 0 } });
export function BorderFlash({ play, color, radius }: { play: boolean; color: string; radius: number }) {
  if (!play) return null;
  return (
    <Animated.View
      style={[
        styles.flash,
        {
          borderRadius: radius,
          borderColor: color,
          animationName: flashFrames,
          animationDuration: 600,
          animationTimingFunction: cssEase.out,
          animationFillMode: 'both',
        },
      ]}
    />
  );
}

// A single chevron that turns to point up when open.
export function Chevron({ open, color, size = 16 }: { open: boolean; color: string; size?: number }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[
        { transform: [{ rotate: open ? '180deg' : '0deg' }] },
        reduced ? null : { transitionProperty: 'transform', transitionDuration: duration.state, transitionTimingFunction: cssEase.inOut },
      ]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

// Swaps content when `id` changes: `roll` sends the old value up and brings the new one from below, `fade`
// cross-fades. The first render shows the content in place. Fades only under reduced motion.
const rollIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: ease.out },
}).duration(duration.state);
const rollOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: -10 }], easing: ease.out },
}).duration(duration.state);
const swapIn = FadeIn.duration(duration.state).reduceMotion(never);
const swapOut = FadeOut.duration(duration.state).reduceMotion(never);
export function ValueSwap({ id, kind = 'roll', style, children }: PropsWithChildren<{ id: string; kind?: 'roll' | 'fade'; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const roll = kind === 'roll' && !reduced;
  return (
    <LayoutAnimationConfig skipEntering>
      <View style={roll ? styles.clip : null}>
        <Animated.View key={id} entering={roll ? rollIn : swapIn} exiting={roll ? rollOut : swapOut} style={style}>
          {children}
        </Animated.View>
      </View>
    </LayoutAnimationConfig>
  );
}

const AnimatedGText = Animated.createAnimatedComponent(GText);

type Segment = { x: number; width: number; height: number };

// Segmented picker whose selection pill slides between options. The pill is absolute and childless, so animating its
// width re-lays-out nothing else.
export function SegmentedPicker<T extends string>({
  p,
  options,
  value,
  onChange,
}: {
  p: Palette;
  options: readonly { level: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const reduced = useReducedMotion();
  const [segments, setSegments] = useState<Partial<Record<T, Segment>>>({});
  const placed = useRef(false);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);

  useEffect(() => {
    const segment = segments[value];
    if (!segment) return;
    height.set(segment.height);
    if (!placed.current || reduced) {
      placed.current = true;
      x.set(segment.x);
      width.set(segment.width);
      return;
    }
    const slide = { duration: 250, easing: ease.inOut };
    x.set(withTiming(segment.x, slide));
    width.set(withTiming(segment.width, slide));
  }, [segments, value, reduced, x, width, height]);

  const pill = useAnimatedStyle(() => ({ width: width.get(), height: height.get(), transform: [{ translateX: x.get() }] }));

  return (
    <View style={styles.segments}>
      <Animated.View style={[styles.pill, { backgroundColor: p.primary }, pill]} />
      {options.map(({ level, label }) => {
        const active = level === value;
        return (
          <Pressable
            key={level}
            onLayout={(event) => {
              const { x: left, width: w, height: h } = event.nativeEvent.layout;
              setSegments((current) => {
                const known = current[level];
                return known && known.x === left && known.width === w && known.height === h ? current : { ...current, [level]: { x: left, width: w, height: h } };
              });
            }}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(level);
            }}
            style={styles.segment}>
            <AnimatedGText
              weight={active ? 700 : 600}
              style={{ color: active ? p.bg : p.muted, fontSize: 10.5, transitionProperty: 'color', transitionDuration: 250, transitionTimingFunction: cssEase.inOut }}>
              {label}
            </AnimatedGText>
          </Pressable>
        );
      })}
    </View>
  );
}

// The "Draft again" tile: sinks under the finger, and its arrow turns half a circle per press.
export function RegenerateTile({ p, disabled, onPress }: { p: Palette; disabled: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const [turns, setTurns] = useState(0);
  const angle = useSharedValue(0);
  const arrow = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Draft again"
      disabled={disabled}
      onPress={() => {
        const next = turns + 1;
        setTurns(next);
        if (!reduced) angle.set(withSpring(next * 180, spring.snap));
        onPress();
      }}
      style={[styles.regenerate, { backgroundColor: p.surface }]}>
      <Animated.View style={arrow}>
        <Icon name="refresh" color={p.accent} size={20} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  flash: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderWidth: 1.5, pointerEvents: 'none' },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { position: 'absolute', top: 0, left: 0, borderRadius: 999 },
  segment: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  regenerate: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// Cross-fades a status surface's border, fill and opacity when its state changes. Spread into an Animated.View style.
export const stateFade = {
  transitionProperty: ['borderColor', 'backgroundColor', 'opacity'],
  transitionDuration: 200,
  transitionTimingFunction: cssEase.out,
} satisfies CSSTransitionProperties;
