import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type EntryOrExitLayoutType,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  Keyframe,
  LayoutAnimationConfig,
  ReduceMotion,
  useReducedMotion,
} from 'react-native-reanimated';

import { duration, ease } from '@/components/motion';

// How the next screen arrives, judged from where the user came from:
// - tab: bottom-nav peers swap instantly.
// - push / back: going deeper enters from the right; returning enters from the left.
// - up: a full-screen modal (a step, the streak) rises from below.
// - reveal: closing a modal uncovers the screen underneath, so it only settles in place.
// - celebrate: a plain fade, because the completion screen runs its own choreography.
// - auth: signing in or out, or the first screen after launch.
export type TransitionKind = 'tab' | 'push' | 'back' | 'up' | 'reveal' | 'celebrate' | 'auth';

const SLIDE = 24;
const RISE = 32;

// Built once at module scope: builders made during render cost every render. Only the incoming screen animates;
// the old one unmounts at once, so nothing waits on an exit and the new screen takes touches immediately.
const entering: Record<TransitionKind, EntryOrExitLayoutType | undefined> = {
  tab: undefined,
  push: FadeInRight.duration(260).easing(ease.out).withInitialValues({ transform: [{ translateX: SLIDE }] }),
  back: FadeInLeft.duration(260).easing(ease.out).withInitialValues({ transform: [{ translateX: -SLIDE }] }),
  up: FadeInDown.duration(280).easing(ease.out).withInitialValues({ transform: [{ translateY: RISE }] }),
  reveal: new Keyframe({
    from: { opacity: 0, transform: [{ scale: 0.985 }] },
    to: { opacity: 1, transform: [{ scale: 1 }], easing: ease.out },
  }).duration(160),
  celebrate: FadeIn.duration(200).easing(ease.out),
  auth: FadeIn.duration(duration.enter).easing(ease.out),
};

// Reduced motion keeps a short fade for every kind but tabs. `Never` because the default (`System`) would skip it.
const fade = FadeIn.duration(duration.state).easing(ease.out).reduceMotion(ReduceMotion.Never);

// Remounts its content whenever `screen` changes and plays the entrance for `kind`. `background` should match the
// incoming screen's, so the strip uncovered by the slide and the fade itself never show a different color.
export function ScreenTransition({
  screen,
  kind,
  background,
  children,
}: PropsWithChildren<{ screen: string; kind: TransitionKind; background: string }>) {
  const reduced = useReducedMotion();
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {/* skipExiting: when a screen is replaced, exit animations inside it (a removed row, a fading strip) would
          otherwise hold the old screen on top of the new one until they finish. */}
      <LayoutAnimationConfig key={screen} skipExiting>
        <Animated.View entering={kind === 'tab' ? undefined : reduced ? fade : entering[kind]} style={styles.root}>
          {children}
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
