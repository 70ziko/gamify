import { type ComponentProps, type PropsWithChildren, useEffect, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, {
  type CSSStyle,
  type EntryExitAnimationFunction,
  type EntryOrExitLayoutType,
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Path } from 'react-native-svg';

import { GText } from '@/components/gamify-ui';
import { cssEase, duration, ease, enterUp, PressableScale, spring, useFirstTime, useSeen } from '@/components/motion';

// Motion for Home and the roadmap path (the Continue tab). Both open dozens of times a day, so they animate only their
// first appearance in a session and what changed while the user was elsewhere (a finished step or quest, XP, a longer
// streak). Every other visit shows the screen already in place. Fades keep playing under reduced motion (`Never`).

export type Entering = EntryOrExitLayoutType;

const never = ReduceMotion.Never;
const fadeIn = FadeIn.duration(duration.state).reduceMotion(never);
const fadeOut = FadeOut.duration(duration.state).reduceMotion(never);

// A change waits this long after the screen mounts, so it plays once the screen has settled and the eye is on it.
const QUEST_LANDING = 300;
const STAT_LANDING = 250;
const FILL_DELAY = 200;
// After a finished step: the node pops and the path draws on first, then the next-step card rises in.
const PATH_DELAY = 120;
const CARD_DELAY = 220;

const MAX_STAGGER = 24;
const at = (index: number) => Math.min(index, MAX_STAGGER - 1);
const blocksIn = Array.from({ length: MAX_STAGGER }, (_, index) => enterUp(index));
const blocksInReduced = Array.from({ length: MAX_STAGGER }, (_, index) => enterUp(index, true));

// `entering` for a screen's blocks, by position: a staggered rise the first time `key` mounts this session, nothing after.
export function useEnterOnce(key: string) {
  const first = useFirstTime(key);
  const reduced = useReducedMotion();
  return (index: number) => (first ? (reduced ? blocksInReduced : blocksIn)[at(index)] : undefined);
}

// A value that may have changed while the user was on another screen. `shown` starts at what `seenKey` showed last time
// and becomes `value` after `delay`. `pending` is true while the old value is still up, `landed` once the new one has
// replaced it during this mount. A value that wasn't there before (still loading) just appears.
export function useLanding<T>(seenKey: string, value: T, delay: number) {
  const previous = useSeen(seenKey, value);
  const [held, setHeld] = useState(previous);
  const shown = held === undefined || value === undefined ? value : held;
  const pending = !Object.is(shown, value);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setHeld(value), delay);
    return () => clearTimeout(timer);
  }, [pending, value, delay]);
  const landed = previous !== undefined && shown !== undefined && !Object.is(shown, previous);
  return { shown, previous, pending, landed };
}

export const landing = { quest: QUEST_LANDING, stat: STAT_LANDING };

const rollIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 12 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: ease.out },
}).duration(220);
const rollOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: -12 }], easing: ease.out },
}).duration(220);

type Weight = ComponentProps<typeof GText>['weight'];

// Text that rolls to a new value: the old one slides up and out while the new one rises from below (a cross-fade under
// reduced motion). Pass `pending` and `landed` from `useLanding`, so only a real change rolls, not data arriving.
export function RollingText({ text, pending, landed, weight, style }: { text: string; pending: boolean; landed: boolean; weight?: Weight; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  return (
    <View style={styles.clip}>
      <Animated.View key={text} entering={landed ? (reduced ? fadeIn : rollIn) : undefined} exiting={pending ? (reduced ? fadeOut : rollOut) : undefined}>
        <GText weight={weight} style={style}>{text}</GText>
      </Animated.View>
    </View>
  );
}

// Where a progress bar starts filling: the percent it showed when `seenKey` was last on screen, if it has grown since.
// A level-up (`level` grew) fills from empty. Pass `initial` and `delay` to ProgressBar or LevelBar.
export function useFillFrom(seenKey: string, percent: number, level?: number) {
  const previous = useSeen(seenKey, percent);
  const previousLevel = useSeen(`${seenKey}:level`, level);
  if (level !== undefined && previousLevel !== undefined && level > previousLevel) return { initial: 0, delay: FILL_DELAY };
  return previous < percent ? { initial: previous, delay: FILL_DELAY } : { initial: undefined, delay: undefined };
}

// Fades its children in when `id` differs from the one `seenKey` showed last time (Home's "Up next" after a step), and
// cross-fades when it changes on screen.
export function FadeOnChange({ seenKey, id, children }: PropsWithChildren<{ seenKey: string; id: string }>) {
  const previous = useSeen(seenKey, id);
  return (
    <Animated.View key={id} entering={id === previous ? undefined : fadeIn} exiting={fadeOut}>
      {children}
    </Animated.View>
  );
}

// Springs in from 0.6 while fading in: a win landing (a quest checked, a step node done, the finished-roadmap trophy).
function popAfter(delay: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: duration.press, easing: ease.out })),
        transform: [{ scale: withDelay(delay, withSpring(1, spring.pop)) }],
      },
    };
  };
}
const popNow = popAfter(0);
const popLate = popAfter(PATH_DELAY);
const fadeLate = FadeIn.delay(PATH_DELAY).duration(duration.state).reduceMotion(never);
const checkIn = FadeIn.delay(80).duration(duration.state).reduceMotion(never);

// `entering`/`exiting` for parts of a row that swap look in place (a quest turning done): the outgoing look fades out
// while `pending`; once `landed` the incoming one fades in, or pops (`pop`), with its check mark fading in (`check`).
export function useSwap({ pending, landed }: { pending: boolean; landed: boolean }) {
  const reduced = useReducedMotion();
  return {
    exit: pending ? fadeOut : undefined,
    fade: landed ? fadeIn : undefined,
    pop: landed ? (reduced ? fadeIn : popNow) : undefined,
    check: landed ? checkIn : undefined,
  };
}

// Background tints cross-fade when a row changes state.
export const tintFade: CSSStyle<ViewStyle> = {
  transitionProperty: 'backgroundColor',
  transitionDuration: duration.state,
  transitionTimingFunction: cssEase.out,
};

const floatUp: CSSStyle<ViewStyle> = {
  animationName: {
    from: { opacity: 0, transform: [{ translateY: 4 }] },
    '25%': { opacity: 1, transform: [{ translateY: 0 }] },
    to: { opacity: 0, transform: [{ translateY: -12 }] },
  },
  animationDuration: 500,
  animationTimingFunction: cssEase.out,
  animationFillMode: 'forwards',
};

// "+XP" that floats up off a quest's reward as the quest lands, then fades. Skipped under reduced motion.
export function XpFloat({ text, color }: { text: string; color: string }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <Animated.View style={[styles.float, floatUp]}>
      <GText weight={800} style={{ color, fontSize: 11.5 }}>{text}</GText>
    </Animated.View>
  );
}

type Point = { x: number; y: number };

// The roadmap path through `points`: an S-bend between each pair.
export function pathThrough(points: Point[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x} ${point.y}`;
      const previous = points[index - 1];
      const middle = (previous.y + point.y) / 2;
      return `C ${previous.x} ${middle} ${point.x} ${middle} ${point.x} ${point.y}`;
    })
    .join(' ');
}

// Length of `pathThrough(points)`, from 16 samples per bend: close enough to drive a stroke reveal.
export function pathLength(points: Point[]) {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const middle = (a.y + b.y) / 2;
    let x = a.x;
    let y = a.y;
    for (let sample = 1; sample <= 16; sample++) {
      const t = sample / 16;
      const u = 1 - t;
      const nextX = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
      const nextY = u * u * u * a.y + 3 * u * u * t * middle + 3 * u * t * t * middle + t * t * t * b.y;
      length += Math.hypot(nextX - x, nextY - y);
      x = nextX;
      y = nextY;
    }
  }
  return length;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
// The dash runs past the path's end, so sampling error and the round cap never cut the stroke short.
const DASH_SLACK = 24;

// The walked (purple) stretch of the roadmap path. `from` is how far along it reached before the step just finished:
// the stroke draws on from there to its end. Without `from`, or under reduced motion, it is drawn in full. Key it by
// the next step, so a new `from` starts hidden instead of flashing the finished stroke for a frame.
export function WalkedPath({ points, from, stroke }: { points: Point[]; from?: number; stroke: string }) {
  const reduced = useReducedMotion();
  const dash = pathLength(points) + DASH_SLACK;
  const reveal = from !== undefined && !reduced;
  const offset = useSharedValue(from !== undefined && !reduced ? dash - from : 0);
  useEffect(() => {
    if (reveal) offset.set(withDelay(PATH_DELAY, withTiming(0, { duration: duration.fill, easing: ease.inOut })));
  }, [reveal, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));
  return (
    <AnimatedPath
      d={pathThrough(points)}
      stroke={stroke}
      strokeWidth={16}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={reveal ? [dash, dash] : undefined}
      animatedProps={animatedProps}
    />
  );
}

const nodesIn = Array.from({ length: MAX_STAGGER }, (_, index) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.85 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.out },
  })
    .duration(200)
    .delay(index * 35),
);
const nodesInReduced = Array.from({ length: MAX_STAGGER }, (_, index) => FadeIn.duration(200).delay(index * 35).reduceMotion(never));

const cardRise: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 24 }] },
    animations: {
      opacity: withDelay(CARD_DELAY, withTiming(1, { duration: duration.enter, easing: ease.out })),
      transform: [{ translateY: withDelay(CARD_DELAY, withSpring(0, spring.snap)) }],
    },
  };
};
const cardFade = FadeIn.delay(CARD_DELAY).duration(duration.enter).reduceMotion(never);

// What the roadmap path animates. On the first visit this session, nodes pop in top to bottom (`node(index)`), the
// next-step card rises with them (`card(index)`), and the checkpoint comes last. When the next step differs from the
// one last shown here, the step in between was just finished: its node pops done, the walked path draws on to the new
// card (`WalkedPath from`), the card rises in, and the header bar fills. Later visits show everything in place.
export function usePathMotion(roadmapId: string, nextId: string | null, percent: number) {
  const first = useFirstTime(`path:${roadmapId}:enter`);
  const previousNext = useSeen(`path:${roadmapId}:next`, nextId);
  const fill = useFillFrom(`path:${roadmapId}:done`, percent);
  const reduced = useReducedMotion();
  const finished = previousNext !== null && previousNext !== nextId ? previousNext : undefined;
  return {
    finished,
    // The finished-roadmap trophy pops the first time it shows this session, or right after the last step.
    celebrate: first || finished !== undefined,
    fill,
    node: (index: number, id?: string): Entering | undefined => {
      if (id !== undefined && id === finished) return reduced ? fadeLate : popLate;
      return first ? (reduced ? nodesInReduced : nodesIn)[at(index)] : undefined;
    },
    card: (index: number): Entering | undefined => {
      if (finished) return reduced ? cardFade : cardRise;
      return first ? (reduced ? blocksInReduced : blocksIn)[at(index)] : undefined;
    },
    trophy: reduced ? fadeLate : popLate,
  };
}

const pulse: CSSStyle<ViewStyle> = {
  animationName: {
    from: { opacity: 0.45, transform: [{ scale: 1 }] },
    to: { opacity: 0, transform: [{ scale: 1.45 }] },
  },
  animationDuration: 1800,
  animationIterationCount: 'infinite',
  animationTimingFunction: cssEase.out,
};

// A round button (the next-step card's play circle) with a ring breathing out behind it to invite the tap. The ring is
// off under reduced motion.
export function PulseButton({ color, size, label, onPress, children }: PropsWithChildren<{ color: string; size: number; label: string; onPress: () => void }>) {
  const reduced = useReducedMotion();
  return (
    <PressableScale scale={0.95} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {reduced ? null : <Animated.View style={[styles.passThrough, { borderRadius: size / 2, backgroundColor: color }, pulse]} />}
      {children}
    </PressableScale>
  );
}

const glowFrames = {
  from: { opacity: 0, transform: [{ scale: 0.9 }] },
  '30%': { opacity: 0.5, transform: [{ scale: 1.2 }] },
  to: { opacity: 0, transform: [{ scale: 1.5 }] },
};
const glowFramesReduced = { from: { opacity: 0 }, '30%': { opacity: 0.4 }, to: { opacity: 0 } };
const glowTiming: CSSStyle<ViewStyle> = {
  animationDuration: 1000,
  animationDelay: PATH_DELAY,
  animationTimingFunction: cssEase.out,
  animationFillMode: 'forwards',
};

// A soft glow that swells once behind something that just landed (the finished-roadmap trophy), then fades away.
export function Glow({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      style={[styles.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style, glowTiming, { animationName: reduced ? glowFramesReduced : glowFrames }]}
    />
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  passThrough: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
  // Rises beside the XP label inside its own row, so it covers neither that label nor the quest above.
  float: { position: 'absolute', right: '100%', top: 0, marginRight: 8, opacity: 0, pointerEvents: 'none' },
  glow: { position: 'absolute', opacity: 0, pointerEvents: 'none' },
});
