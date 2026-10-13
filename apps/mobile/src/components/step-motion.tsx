import { type PropsWithChildren, useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  css,
  type CSSTransitionProperties,
  type EntryAnimationsValues,
  FadeIn,
  FadeInRight,
  FadeOut,
  Keyframe,
  LayoutAnimationConfig,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GText, GUTTER, Icon, type Palette, Pill } from '@/components/gamify-ui';
import { cssEase, duration, ease, haptic, PressableScale, spring } from '@/components/motion';

// Motion for the step session (StepScreen and Timer in gamify-app.tsx). Fallbacks for reduced motion are fades that
// opt out of ReduceMotion.System, which would otherwise skip them.

// Exercise → exercise: the old block leaves left while the next arrives from the right, 60ms behind so the two
// don't muddle.
const slideIn = FadeInRight.duration(220).delay(60).easing(ease.out).withInitialValues({ transform: [{ translateX: 24 }] });
const slideOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateX: 0 }] },
  100: { opacity: 0, transform: [{ translateX: -24 }], easing: ease.out },
}).duration(160);
const crossIn = FadeIn.duration(220).delay(60).reduceMotion(ReduceMotion.Never);
const crossOut = FadeOut.duration(160).reduceMotion(ReduceMotion.Never);

// The first exercise arrives with the screen, so only later ones slide. Leaving the screen skips the exit too.
export function ExerciseSlide({ index, children }: PropsWithChildren<{ index: number }>) {
  const reduced = useReducedMotion();
  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      <Animated.View key={index} entering={reduced ? crossIn : slideIn} exiting={reduced ? crossOut : slideOut} style={styles.slide}>
        {children}
      </Animated.View>
    </LayoutAnimationConfig>
  );
}

export function CloseButton({ p, onPress }: { p: Palette; onPress: () => void }) {
  return (
    <PressableScale scale={0.9} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" onPress={onPress}>
      <GText weight={700} style={{ color: p.dim, fontSize: 24 }}>×</GText>
    </PressableScale>
  );
}

// Matches gamify-ui's Card. These are Animated views of their own: the answer card stays one Pressable when it's
// revealed (Card would swap to a View and lose the color cross-fade), and the timer card eases its height.
const surface = (p: Palette) => ({ backgroundColor: p.surface, borderColor: p.border, shadowColor: p.cardShadow });

const badgePop = css.keyframes({ from: { transform: [{ scale: 0.85 }] }, to: { transform: [{ scale: 1 }] } });
const shake = [-8, 8, -6, 6, -3, 3, 0];
const checkIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.out },
}).duration(duration.state);
const checkInReduced = FadeIn.duration(duration.state).reduceMotion(ReduceMotion.Never);
const numberOut = FadeOut.duration(120).reduceMotion(ReduceMotion.Never);
const colorFade: CSSTransitionProperties<ViewStyle> = {
  transitionProperty: ['backgroundColor', 'borderColor'],
  transitionDuration: duration.state,
  transitionTimingFunction: cssEase.out,
};

export function AnswerCard({
  p,
  option,
  number,
  chosen,
  revealed,
  isAnswer,
  onPick,
}: {
  p: Palette;
  option: string;
  number: number;
  chosen: boolean;
  revealed: boolean;
  isAnswer: boolean;
  onPick: () => void;
}) {
  const reduced = useReducedMotion();
  const tone = revealed && isAnswer ? p.success : revealed && chosen ? p.accent : chosen ? p.primary : undefined;
  const result = revealed && chosen ? (isAnswer ? 'right' : 'wrong') : undefined;
  const shift = useSharedValue(0);
  const size = useSharedValue(1);
  // Checking is the commit: the chosen card pulses when right and shakes when wrong (haptics fire in `check`).
  useEffect(() => {
    if (!result || reduced) return;
    if (result === 'right') {
      size.set(withSequence(withTiming(1.03, { duration: 90, easing: ease.out }), withSpring(1, spring.pop)));
    } else {
      shift.set(withSequence(...shake.map((x) => withTiming(x, { duration: 360 / shake.length }))));
    }
  }, [result, reduced, shift, size]);
  const motion = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }, { scale: size.get() }] }));
  return (
    <Animated.View style={motion}>
      <PressableScale
        scale={0.98}
        disabled={revealed}
        onPress={onPick}
        accessibilityRole="button"
        accessibilityState={{ selected: chosen, disabled: revealed }}
        style={[styles.card, surface(p), styles.answerCard, tone ? { borderColor: tone, borderWidth: 1.5, backgroundColor: `${tone}24` } : null]}>
        <Animated.View
          style={[
            styles.answerNumber,
            { backgroundColor: tone ?? p.sunken, borderColor: tone ?? p.borderStrong },
            colorFade,
            { animationName: chosen && !reduced ? badgePop : 'none', animationDuration: duration.state, animationTimingFunction: cssEase.out },
          ]}>
          {revealed && isAnswer ? (
            <Animated.View key="check" entering={reduced ? checkInReduced : checkIn}>
              <Icon name="check" color={p.bg} size={14} />
            </Animated.View>
          ) : (
            <Animated.View key="number" exiting={numberOut}>
              <GText weight={700} style={{ color: tone ? p.bg : p.dim, fontSize: 12 }}>{number + 1}</GText>
            </Animated.View>
          )}
        </Animated.View>
        <GText weight={tone ? 700 : 600} style={{ color: chosen && !revealed ? p.primaryText : p.ink, fontSize: 14.5, flex: 1 }}>{option}</GText>
      </PressableScale>
    </Animated.View>
  );
}

// The result strip rises from behind the footer by its own height, so it reads as coming out of the button area.
function stripIn(values: EntryAnimationsValues) {
  'worklet';
  const config = { duration: 220, easing: ease.out };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: values.targetHeight }] },
    animations: { opacity: withTiming(1, config), transform: [{ translateY: withTiming(0, config) }] },
  };
}
const stripInReduced = FadeIn.duration(220).reduceMotion(ReduceMotion.Never);
const stripOut = FadeOut.duration(150).easing(ease.out).reduceMotion(ReduceMotion.Never);

// Wraps the session footer (pass it with `position: 'relative'`). The strip sits above it and is drawn beneath it.
// `onSpace` reports the strip's height so the scroll body can make room for it.
export function ResultDock({
  p,
  result,
  onSpace,
  children,
}: PropsWithChildren<{ p: Palette; result?: { correct: boolean; answer: string }; onSpace: (height: number) => void }>) {
  const reduced = useReducedMotion();
  const tone = result?.correct ? p.success : p.accent;
  return (
    <View style={styles.dock} pointerEvents="box-none">
      <LayoutAnimationConfig skipExiting>
        {result ? (
          <Animated.View
            entering={reduced ? stripInReduced : stripIn}
            exiting={stripOut}
            pointerEvents="none"
            onLayout={(event) => onSpace(event.nativeEvent.layout.height)}
            style={styles.stripSlot}>
            <View style={[styles.stripBase, { backgroundColor: p.chrome, shadowColor: p.cardShadow }]}>
              <View style={[styles.strip, { backgroundColor: `${tone}24`, borderColor: `${tone}80` }]}>
                <Icon name={result.correct ? 'check' : 'close'} color={tone} size={15} />
                {result.correct ? (
                  <GText weight={800} style={{ color: p.success, fontSize: 14.5, flex: 1 }}>Nice!</GText>
                ) : (
                  <GText weight={700} style={{ color: p.accentText, fontSize: 13.5, lineHeight: 19, flex: 1 }}>
                    Not quite — the answer is <GText weight={800} style={{ color: p.ink }}>{result.answer}</GText>
                  </GText>
                )}
              </View>
            </View>
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>
      {children}
    </View>
  );
}

// The start pill fades and sinks away while the card eases shut around the clock, which stays put.
const cardResize = LinearTransition.duration(duration.state).easing(ease.inOut);
const pillOut = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.95 }], easing: ease.out },
}).duration(150);
const pillOutReduced = FadeOut.duration(150).reduceMotion(ReduceMotion.Never);

export function TimerCard({
  p,
  text,
  done,
  started,
  onStart,
}: {
  p: Palette;
  text: string;
  done: boolean;
  started: boolean;
  onStart: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View layout={reduced ? undefined : cardResize} style={[styles.card, surface(p), styles.timerCard]}>
      <TimerDigits p={p} text={text} done={done} celebrate={started && done} />
      {started ? null : (
        <Animated.View exiting={reduced ? pillOutReduced : pillOut}>
          <Pill label="Start timer" p={p} onPress={onStart} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const opacityFade: CSSTransitionProperties<ViewStyle> = { transitionProperty: 'opacity', transitionDuration: duration.state, transitionTimingFunction: cssEase.out };

// GText can't transition its color, so the finished digits cross-fade in as a second layer.
function TimerDigits({ p, text, done, celebrate }: { p: Palette; text: string; done: boolean; celebrate: boolean }) {
  const reduced = useReducedMotion();
  const size = useSharedValue(1);
  const celebrated = useRef(false);
  useEffect(() => {
    if (!celebrate || celebrated.current) return;
    celebrated.current = true;
    haptic.success();
    if (!reduced) size.set(withSequence(withTiming(1.08, { duration: 100, easing: ease.out }), withSpring(1, spring.pop)));
  }, [celebrate, reduced, size]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: size.get() }] }));
  return (
    <Animated.View style={pop}>
      <Animated.View style={[opacityFade, { opacity: done ? 0 : 1 }]}>
        <GText weight={800} style={[styles.digits, { color: p.ink }]}>{text}</GText>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, opacityFade, { opacity: done ? 1 : 0 }]}>
        <GText weight={800} style={[styles.digits, { color: p.success }]}>{text}</GText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slide: { gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 2,
  },
  answerCard: { padding: 15, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  answerNumber: { width: 27, height: 27, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timerCard: { padding: 21, borderRadius: 22, alignItems: 'center', gap: 14 },
  digits: { fontSize: 44, letterSpacing: -1 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  stripSlot: { position: 'absolute', left: 0, right: 0, bottom: '100%', paddingHorizontal: GUTTER, paddingBottom: 8 },
  stripBase: { borderRadius: 14, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 22, elevation: 2 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
});
