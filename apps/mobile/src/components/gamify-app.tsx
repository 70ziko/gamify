import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  BackButton,
  Card,
  GUTTER,
  GText,
  GradientCard,
  Icon,
  type IconName,
  IconTile,
  MainScaffold,
  MascotPlaceholder,
  type MainTab,
  Overline,
  palette,
  type Palette,
  Pill,
  PrimaryButton,
  ProgressBar,
  ScreenFrame,
  ScrollBody,
  SectionLink,
  SectionTitle,
  type ThemeMode,
  Toggle,
} from '@/components/gamify-ui';
import { AnimatedCount, Bump, CelebrationCheck, type CountProps, enterAt, type Entrance, LevelUpPill, Pop } from '@/components/celebrate';
import {
  Appear,
  BorderFlash,
  Breathe,
  Chevron,
  Enter,
  ListRow,
  newKey,
  PopIn,
  PopOnChange,
  reflow,
  RegenerateTile,
  SegmentedPicker,
  SkipEnterOnMount,
  SpinnerRing,
  stateFade,
  TurnOnce,
  UnitStep,
  UnitSteps,
  useStagger,
  ValueSwap,
} from '@/components/flow-motion';
import {
  type Entering,
  FadeOnChange,
  Glow,
  landing,
  pathLength,
  pathThrough,
  PulseButton,
  RollingText,
  tintFade,
  useEnterOnce,
  useFillFrom,
  useLanding,
  usePathMotion,
  useSwap,
  WalkedPath,
  XpFloat,
} from '@/components/home-motion';
import { ContentIn, forgetSeen, haptic, PressableScale, useFirstTime, useSeen } from '@/components/motion';
import {
  CheckPop,
  colorTransition,
  CrossFade,
  DelayedSpinner,
  Dim,
  FlashRing,
  FloatingBadge,
  FocusRing,
  fadeIn,
  HighlightPressable,
  KeyedFade,
  KeyFace,
  RatingStar,
  ShakeIn,
  SpinningHalo,
  Swap,
  Turn,
  useEntrances,
  useGridEntrance,
  usePopIn,
} from '@/components/screen-motion';
import { ScreenTransition, type TransitionKind } from '@/components/screen-transition';
import { SheetModal, SheetPanel } from '@/components/sheet';
import { AnswerCard, CloseButton, ExerciseSlide, ResultDock, TimerCard } from '@/components/step-motion';
import {
  api,
  type Brief,
  type Category,
  type Completion,
  type DayXp,
  type Draft,
  type DraftRun,
  type League,
  type Level,
  type Listing,
  type ListingDetail,
  type Profile,
  type Progress,
  queryClient,
  type Roadmap,
  type RoadmapSummary,
  send,
  type Step,
  type StepSuggestions,
  useApi,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';

type ScreenName =
  | 'welcome'
  | 'interests'
  | 'commitment'
  | 'sign-up'
  | 'sign-in'
  | 'home'
  | 'roadmap'
  | 'step'
  | 'complete'
  | 'ai-prompt'
  | 'ai-generating'
  | 'ai-review'
  | 'manual'
  | 'explore'
  | 'course'
  | 'league'
  | 'streak'
  | 'profile'
  | 'settings';

type Prefs = { interests: Category[]; daily_xp_goal: number; reminder_time: string | null };
type StepResult = { completion: Completion; title: string; correct: number; quizzes: number; seconds: number };
type Person = { handle: string | null; display_name: string | null };
type Tint = 'primary' | 'success' | 'streak' | 'accentDeep';

const CATEGORIES: Category[] = ['fitness', 'languages', 'music', 'coding', 'reading', 'mindfulness', 'finance', 'cooking', 'career', 'art'];
const LOOKS: Record<Category, { icon: IconName; tint: Tint }> = {
  fitness: { icon: 'dumbbell', tint: 'success' },
  languages: { icon: 'language', tint: 'accentDeep' },
  music: { icon: 'piano', tint: 'primary' },
  coding: { icon: 'code', tint: 'primary' },
  reading: { icon: 'book', tint: 'streak' },
  mindfulness: { icon: 'moon', tint: 'success' },
  finance: { icon: 'chart', tint: 'streak' },
  cooking: { icon: 'fork', tint: 'accentDeep' },
  career: { icon: 'briefcase', tint: 'primary' },
  art: { icon: 'brush', tint: 'accentDeep' },
  custom: { icon: 'flag', tint: 'success' },
};
const PACES = [
  { minutes: '5', name: 'Casual', description: '1 step a day · 10 XP goal', goal: 10 },
  { minutes: '15', name: 'Regular', description: '2 steps a day · 30 XP goal', goal: 30 },
  { minutes: '30', name: 'Intense', description: '4 steps a day · 60 XP goal', goal: 60 },
];
const REMINDERS = [
  { label: '8:00 AM', time: '08:00:00' },
  { label: '12:30 PM', time: '12:30:00' },
  { label: '8:00 PM', time: '20:00:00' },
];
const WEEKS = [4, 8, 12, 24];
const MINUTES = [5, 10, 15, 30, 60];
// Rivals' XP only reaches the app on refetch, so poll the league while it's on screen.
const LEAGUE_REFETCH_MS = 30_000;
const LEVELS = [
  { level: 'beginner', label: 'Beginner' },
  { level: 'some', label: 'Some' },
  { level: 'solid', label: 'Solid' },
] as const;
const DEFAULT_BRIEF: Brief = { goal: '', weeks: 12, minutes_per_day: 15, level: 'beginner', context: '' };

const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const formatCount = (count: number) => (count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${count}`);
const learners = (count: number) => `${formatCount(count)} learner${count === 1 ? '' : 's'}`;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, '0')}`;
const cycle = <T,>(options: readonly T[], value: T) => options[(options.indexOf(value) + 1) % options.length];
const nameOf = (person: Person) => person.handle ?? person.display_name ?? 'Someone';
const firstName = (person: Person) => (person.display_name ?? person.handle ?? '').split(' ')[0];
const initial = (person: Person) => (person.display_name || person.handle || '?').charAt(0).toUpperCase();

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function useFocusRoadmap(roadmapId?: string) {
  const roadmaps = useApi<RoadmapSummary[]>('/roadmaps');
  const focus = roadmaps.data?.find((item) => item.id === roadmapId) ?? roadmaps.data?.find((item) => item.next_step) ?? roadmaps.data?.[0];
  return { roadmaps, focus };
}

// Navigation keeps the previous screen so the transition can tell a push from a back.
type Nav = { screen: ScreenName; from?: ScreenName };
const moveTo = (next: ScreenName) => (nav: Nav): Nav => (nav.screen === next ? nav : { screen: next, from: nav.screen });

// How deep each screen sits: a deeper screen enters from the right, a shallower one from the left.
const DEPTH: Record<ScreenName, number> = {
  welcome: 0,
  interests: 1,
  commitment: 2,
  'sign-up': 3,
  'sign-in': 1,
  home: 0,
  explore: 0,
  roadmap: 0,
  league: 0,
  profile: 0,
  course: 1,
  settings: 1,
  manual: 1,
  'ai-prompt': 1,
  'ai-generating': 2,
  'ai-review': 3,
  step: 1,
  complete: 2,
  streak: 1,
};
const TABS = new Set<ScreenName>(['home', 'explore', 'roadmap', 'league', 'profile']);
const SIGNED_OUT = new Set<ScreenName>(['welcome', 'interests', 'commitment', 'sign-up', 'sign-in']);
// Forward moves that land shallower: finishing a flow opens its roadmap, regenerating restarts the draft.
const FORWARD = new Set<`${ScreenName}>${ScreenName}`>(['course>roadmap', 'manual>roadmap', 'ai-review>roadmap', 'ai-review>ai-generating']);
// Screens drawn in the chosen theme; the rest are always dark.
const THEMED = new Set<ScreenName>(['home', 'explore', 'roadmap', 'league', 'profile', 'course', 'settings']);

function transitionFor({ screen: to, from }: Nav): TransitionKind {
  if (!from || SIGNED_OUT.has(from) !== SIGNED_OUT.has(to)) return 'auth';
  if (TABS.has(from) && TABS.has(to)) return 'tab';
  // The streak sheet rises on its own, so its screen only fades in (a second rise would stack on the first).
  if (to === 'streak') return 'celebrate';
  if (to === 'step') return 'up';
  if (from === 'step' && to === 'complete') return 'celebrate';
  // Closing a modal or cancelling a generation uncovers the screen underneath.
  if (from === 'step' || from === 'streak' || from === 'complete' || (from === 'ai-generating' && to === 'ai-prompt')) return 'reveal';
  if (FORWARD.has(`${from}>${to}`)) return 'push';
  return DEPTH[to] < DEPTH[from] ? 'back' : 'push';
}

export function GamifyApp() {
  const [session, setSession] = useState<Session | null>();
  const [nav, setNav] = useState<Nav>({ screen: 'welcome' });
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [prefs, setPrefs] = useState<Prefs>({ interests: ['fitness', 'music', 'mindfulness'], daily_xp_goal: 30, reminder_time: '20:00:00' });
  const [roadmapId, setRoadmapId] = useState<string>();
  const [stepId, setStepId] = useState('');
  const [result, setResult] = useState<StepResult>();
  const [listingId, setListingId] = useState('');
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [runId, setRunId] = useState('');
  const [draft, setDraft] = useState<Draft>();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'INITIAL_SESSION' && next) setNav(moveTo('home'));
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        forgetSeen();
        setNav(moveTo('welcome'));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <ScreenFrame mode={mode} />;

  const go = (next: ScreenName) => setNav(moveTo(next));
  const selectMain = (tab: MainTab) => {
    go(tab === 'continue' ? 'roadmap' : tab);
  };
  const openRoadmap = (id: string) => {
    setRoadmapId(id);
    go('roadmap');
  };
  const play = (roadmap: string, step: string) => {
    setRoadmapId(roadmap);
    setStepId(step);
    go('step');
  };
  const openListing = (id: string) => {
    setListingId(id);
    go('course');
  };
  const openAi = (goal?: string) => {
    if (goal) setBrief({ ...DEFAULT_BRIEF, goal });
    go('ai-prompt');
  };
  const startDraft = async (next: Brief) => {
    const run = await api<DraftRun>('/ai/roadmap-drafts', 'POST', next);
    setBrief(next);
    setRunId(run.id);
    go('ai-generating');
  };

  const { screen } = nav;
  const render = () => {
    switch (screen) {
      case 'welcome':
        return <WelcomeScreen onStart={() => go('interests')} onSignIn={() => go('sign-in')} />;
      case 'interests':
        return <InterestsScreen picked={prefs.interests} onPick={(interests) => setPrefs({ ...prefs, interests })} onBack={() => go('welcome')} onContinue={() => go('commitment')} />;
      case 'commitment':
        return <CommitmentScreen prefs={prefs} onChange={setPrefs} onBack={() => go('interests')} onContinue={() => go('sign-up')} />;
      case 'sign-up':
        return <AuthScreen prefs={prefs} onBack={() => go('commitment')} onSwitch={() => go('sign-in')} onDone={() => go('home')} />;
      case 'sign-in':
        return <AuthScreen onBack={() => go('welcome')} onSwitch={() => go('interests')} onDone={() => go('home')} />;
      case 'home':
        return <HomeScreen mode={mode} roadmapId={roadmapId} onSelect={selectMain} onRoadmap={openRoadmap} onPlay={play} onStreak={() => go('streak')} onCreateAi={openAi} onCreateManual={() => go('manual')} onExplore={() => go('explore')} />;
      case 'roadmap':
        return <RoadmapScreen mode={mode} roadmapId={roadmapId} onSelect={selectMain} onBack={() => go('home')} onPlay={play} />;
      case 'step':
        return <StepScreen stepId={stepId} onClose={() => go('roadmap')} onDone={(done) => { setResult(done); go('complete'); }} />;
      case 'complete':
        return result ? <CompleteScreen result={result} onContinue={() => go('roadmap')} /> : null;
      case 'ai-prompt':
        return <AiPromptScreen brief={brief} onBack={() => go('explore')} onGenerate={startDraft} />;
      case 'ai-generating':
        return <AiGeneratingScreen runId={runId} onCancel={() => go('ai-prompt')} onFinished={(next) => { setDraft(next); go('ai-review'); }} />;
      case 'ai-review':
        return draft ? <AiReviewScreen draft={draft} onBack={() => go('ai-prompt')} onRegenerate={() => startDraft(brief)} onCreated={openRoadmap} /> : null;
      case 'manual':
        return <ManualScreen onBack={() => go('explore')} onCreated={openRoadmap} />;
      case 'explore':
        return <ExploreScreen mode={mode} onSelect={selectMain} onListing={openListing} onCreateAi={openAi} onCreateManual={() => go('manual')} />;
      case 'course':
        return <CourseScreen mode={mode} listingId={listingId} onBack={() => go('explore')} onOpen={openRoadmap} />;
      case 'league':
        return <LeagueScreen mode={mode} onSelect={selectMain} />;
      case 'streak':
        return <StreakScreen onBack={() => go('home')} />;
      case 'profile':
        return <ProfileScreen mode={mode} onSelect={selectMain} onSettings={() => go('settings')} />;
      case 'settings':
        return <SettingsScreen mode={mode} setMode={setMode} email={session?.user.email ?? ''} onBack={() => go('profile')} />;
    }
  };

  return (
    <ScreenTransition
      // Sign-in and sign-up are one form that toggles, so switching keeps the typed fields and doesn't transition.
      screen={screen === 'sign-up' ? 'sign-in' : screen}
      kind={transitionFor(nav)}
      background={(THEMED.has(screen) ? palette[mode] : palette.dark).bg}>
      {render()}
    </ScreenTransition>
  );
}

function Pending({ p, error }: { p: Palette; error?: Error | null }) {
  if (!error) {
    return (
      <View style={styles.pending}>
        <DelayedSpinner color={p.primary} />
      </View>
    );
  }
  return (
    <Animated.View entering={fadeIn} style={styles.pending}>
      <GText weight={600} style={{ color: p.muted, fontSize: 13.5, textAlign: 'center' }}>{error.message}</GText>
      <PrimaryButton label="Try again" onPress={() => queryClient.invalidateQueries()} p={p} compact />
    </Animated.View>
  );
}

function ErrorText({ p, error }: { p: Palette; error?: string }) {
  return error ? <ShakeIn key={error} message={error}><GText weight={600} style={{ color: p.accentText, fontSize: 12.5 }}>{error}</GText></ShakeIn> : null;
}

function Field({ p, label, onFocus, onBlur, ...props }: TextInputProps & { p: Palette; label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <Card p={p} style={styles.field}>
      <Overline p={p} style={{ fontSize: 9.5 }}>{label}</Overline>
      <TextInput
        placeholderTextColor={p.dim}
        {...props}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[styles.fieldInput, { color: p.ink }]}
      />
      <FocusRing visible={focused} color={p.primary} radius={16} />
    </Card>
  );
}

// `from` is where the bar starts when arriving from the screen before; going back fills down from where it was.
function OnboardingHeader({ progress, from, onBack, p }: { progress: number; from: number; onBack: () => void; p: Palette }) {
  const last = useSeen('onboarding:progress', progress);
  return (
    <View style={styles.onboardingHeader}>
      <BackButton p={p} onPress={onBack} />
      <View style={{ flex: 1 }}>
        <ProgressBar value={progress} initial={last === progress ? from : last} p={p} color={p.accent} height={6} />
      </View>
    </View>
  );
}

function WelcomeScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const p = palette.dark;
  // First impression, under 700ms: halo, quest mark, badges, then copy and actions rise in. Buttons work from frame one.
  const markIn = usePopIn(true, 60, 0.8, 'pop');
  const [headlineIn, descriptionIn, dotsIn, actionsIn] = useEntrances(true, 4, 220, 60);
  return (
    <ScreenFrame mode="dark">
      <View style={styles.welcomeBody}>
        <View style={styles.questMarkWrap}>
          <SpinningHalo size={136} color={p.borderStrong} />
          <Animated.View entering={markIn}>
            <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.questMark}>
              <GText weight={800} style={[styles.star, { color: p.bg }]}>★</GText>
            </LinearGradient>
          </Animated.View>
          <FloatingBadge style={styles.heroBadgeTop} delay={200} period={2600}>
            <View style={[styles.heroBadge, { backgroundColor: p.raised, borderColor: p.borderStrong }]}>
              <GText style={{ fontSize: 19 }}>🔥</GText>
            </View>
          </FloatingBadge>
          <FloatingBadge style={styles.heroBadgeBottom} delay={250} period={3100} sink>
            <View style={[styles.heroBadge, { backgroundColor: p.raised, borderColor: p.borderStrong }]}>
              <Icon name="trophy" color={p.success} size={19} />
            </View>
          </FloatingBadge>
        </View>
        <View style={styles.centeredCopy}>
          <Animated.View entering={headlineIn}>
            <GText weight={800} style={[styles.display, { color: p.ink }]}>Turn anything{`\n`}into a quest</GText>
          </Animated.View>
          <Animated.View entering={descriptionIn}>
            <GText weight={500} style={[styles.heroDescription, { color: p.muted }]}>Habits, skills, side projects. Describe a goal and get a roadmap you actually want to finish.</GText>
          </Animated.View>
        </View>
      </View>
      <View style={styles.welcomeFooter}>
        <Animated.View entering={dotsIn} style={styles.dots}>
          <View style={[styles.longDot, { backgroundColor: p.accent }]} />
          <View style={[styles.dot, { backgroundColor: p.borderStrong }]} />
          <View style={[styles.dot, { backgroundColor: p.borderStrong }]} />
        </Animated.View>
        <Animated.View entering={actionsIn} style={{ gap: 13 }}>
          <PrimaryButton label="Get started" onPress={onStart} p={p} />
          <Pressable onPress={onSignIn} style={styles.textButton}>
            <GText weight={600} style={{ color: p.muted, fontSize: 13.5 }}>I already have an account</GText>
          </Pressable>
        </Animated.View>
      </View>
    </ScreenFrame>
  );
}

function InterestsScreen({ picked, onPick, onBack, onContinue }: { picked: Category[]; onPick: (interests: Category[]) => void; onBack: () => void; onContinue: () => void }) {
  const p = palette.dark;
  const toggle = (category: Category) => onPick(picked.includes(category) ? picked.filter((item) => item !== category) : [...picked, category]);

  return (
    <ScreenFrame mode="dark">
      <OnboardingHeader progress={66} from={33} onBack={onBack} p={p} />
      <ScrollBody contentStyle={styles.onboardingContent} bottomInset={126}>
        <View style={styles.headingBlock}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>What do you want{`\n`}to level up?</GText>
          <GText style={[styles.screenSubtitle, { color: p.muted }]}>Pick a few. We&apos;ll tune your marketplace feed.</GText>
        </View>
        <View style={styles.pillWrap}>
          {CATEGORIES.map((category) => <Pill key={category} label={titleCase(category)} p={p} selected={picked.includes(category)} onPress={() => toggle(category)} />)}
        </View>
        <Card p={p} style={styles.unsureCard}>
          <IconTile icon="sparkles" color={p.accent} backgroundColor={`${p.accent}22`} />
          <View style={{ flex: 1 }}>
            <GText weight={700} style={{ color: p.ink, fontSize: 14 }}>Not sure yet?</GText>
            <GText style={{ color: p.muted, fontSize: 12, marginTop: 2 }}>Describe a goal and AI builds the path.</GText>
          </View>
        </Card>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}>
        <PrimaryButton label={`Continue · ${picked.length} picked`} onPress={onContinue} p={p} />
      </View>
    </ScreenFrame>
  );
}

function CommitmentScreen({ prefs, onChange, onBack, onContinue }: { prefs: Prefs; onChange: (prefs: Prefs) => void; onBack: () => void; onContinue: () => void }) {
  const p = palette.dark;
  const [time, setTime] = useState(prefs.reminder_time ?? '20:00:00');
  const reminder = prefs.reminder_time !== null;
  return (
    <ScreenFrame mode="dark">
      <OnboardingHeader progress={100} from={66} onBack={onBack} p={p} />
      <ScrollBody contentStyle={styles.onboardingContent} bottomInset={126}>
        <View style={styles.headingBlock}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>Set your daily pace</GText>
          <GText style={[styles.screenSubtitle, { color: p.muted }]}>This becomes your streak goal. Change it any time.</GText>
        </View>
        <View style={{ gap: 8 }}>
          {PACES.map(({ minutes, name, description, goal }) => {
            const picked = prefs.daily_xp_goal === goal;
            return (
              <Card key={name} p={p} raised={picked} onPress={() => { haptic.select(); onChange({ ...prefs, daily_xp_goal: goal }); }} style={[styles.paceCard, picked ? { borderColor: p.primary, borderWidth: 1.5 } : null]}>
                {/* Both tiles render; the gradient one fades over the plain one when picked. */}
                <CrossFade
                  on={picked}
                  style={[styles.minuteTile, { backgroundColor: p.sunken }]}
                  overlay={
                    <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.minuteTile}>
                      <GText weight={800} style={{ color: p.bg, fontSize: 17 }}>{minutes}<GText weight={700} style={{ color: p.bg, fontSize: 10 }}>m</GText></GText>
                    </LinearGradient>
                  }>
                  <GText weight={800} style={{ color: p.muted, fontSize: 17 }}>{minutes}<GText weight={700} style={{ color: p.muted, fontSize: 10 }}>m</GText></GText>
                </CrossFade>
                <View style={{ flex: 1 }}>
                  <GText weight={700} style={{ color: p.ink, fontSize: 15 }}>{name}</GText>
                  <CrossFade on={picked} style={{ marginTop: 2 }} overlay={<GText style={{ color: p.primaryText, fontSize: 12 }}>{description}</GText>}>
                    <GText style={{ color: p.muted, fontSize: 12 }}>{description}</GText>
                  </CrossFade>
                </View>
                <Animated.View style={[styles.radio, picked ? { backgroundColor: p.primary, borderColor: p.primary } : { backgroundColor: `${p.primary}00`, borderColor: p.borderStrong }, colorTransition]}>
                  <CheckPop visible={picked}><Icon name="check" color={p.bg} size={15} /></CheckPop>
                </Animated.View>
              </Card>
            );
          })}
        </View>
        <Card p={p} style={styles.reminderCard}>
          <View style={styles.row}>
            <IconTile icon="bell" color={p.streak} backgroundColor={`${p.streak}22`} />
            <View style={{ flex: 1 }}>
              <GText weight={700} style={{ color: p.ink, fontSize: 14 }}>Daily reminder</GText>
              <GText style={{ color: p.muted, fontSize: 12 }}>A friendly nudge, once a day</GText>
            </View>
            <Toggle on={reminder} p={p} onPress={() => onChange({ ...prefs, reminder_time: reminder ? null : time })} />
          </View>
          <View style={styles.segmentRow}>
            {REMINDERS.map(({ label, time: value }) => <Pill key={value} label={label} p={p} selected={reminder && time === value} showCheck={false} onPress={() => { setTime(value); onChange({ ...prefs, reminder_time: value }); }} style={{ flex: 1 }} />)}
          </View>
        </Card>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}>
        <PrimaryButton label="Start my first roadmap" onPress={onContinue} p={p} />
      </View>
    </ScreenFrame>
  );
}

function AuthScreen({ prefs, onBack, onSwitch, onDone }: { prefs?: Prefs; onBack: () => void; onSwitch: () => void; onDone: () => void }) {
  const p = palette.dark;
  const signUp = prefs !== undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();
  const submit = () => run(async () => {
    const credentials = { email: email.trim(), password };
    const { data, error: authError } = signUp
      ? await supabase.auth.signUp({ ...credentials, options: { data: { display_name: name.trim() || undefined } } })
      : await supabase.auth.signInWithPassword(credentials);
    if (authError) throw authError;
    if (!data.session) throw new Error('Check your inbox to confirm your email, then sign in.');
    await api('/me', 'PATCH', { ...prefs, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    onDone();
  });

  return (
    <ScreenFrame mode="dark">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /></View>
        <ScrollBody contentStyle={styles.onboardingContent} bottomInset={160}>
          <View style={styles.headingBlock}>
            <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>{signUp ? 'Save your progress' : 'Welcome back'}</GText>
            <GText style={[styles.screenSubtitle, { color: p.muted }]}>{signUp ? 'Create an account to keep your streak and XP.' : 'Sign in to pick up where you left off.'}</GText>
          </View>
          {signUp ? <Field p={p} label="Name" value={name} onChangeText={setName} autoComplete="name" placeholder="What should we call you?" /> : null}
          <Field p={p} label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <Field p={p} label="Password" value={password} onChangeText={setPassword} autoComplete={signUp ? 'new-password' : 'current-password'} secureTextEntry placeholder="At least 6 characters" onSubmitEditing={submit} />
          <ErrorText p={p} error={error} />
        </ScrollBody>
        <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}>
          <PrimaryButton label={signUp ? 'Create account' : 'Sign in'} onPress={submit} p={p} disabled={busy || !email.trim() || password.length < 6} />
          <Pressable onPress={onSwitch} style={styles.textButton}>
            <GText weight={600} style={{ color: p.muted, fontSize: 13.5 }}>{signUp ? 'I already have an account' : 'New here? Get started'}</GText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

function greetingFor(hour: number): { label: string; icon: IconName } {
  if (hour < 5) return { label: 'Up late', icon: 'moon' };
  if (hour < 12) return { label: 'Good morning', icon: 'sunrise' };
  if (hour < 18) return { label: 'Good afternoon', icon: 'sun' };
  return { label: 'Good evening', icon: 'moon' };
}

// The today card's coach line: it celebrates the streak instead of reporting the number. Two sentences, one per line.
function streakLine(days: number) {
  if (days === 0) return 'Fresh start.\nOne step is plenty.';
  if (days < 3) return "You showed up.\nLet's make it a run.";
  if (days < 7) return `${days} days running.\nMomentum's building.`;
  if (days < 14) return 'A full week in.\nKeep the rhythm.';
  if (days < 21) return 'Two weeks strong.\nThis is sticking.';
  if (days < 30) return "Three weeks in.\nThat's a habit now.";
  return `${days} days strong.\nKeep it rolling.`;
}

// Home must fit one phone screen above the bottom nav, so "Your roadmaps" is visible without scrolling.
// Short phones (iPhone SE, 360×740 Androids) get the compact sizes.
const homeSizes = {
  regular: { gap: 20, nextPadding: 14, mascot: 116, coach: 19, stepTitle: 17, compactButton: false, questRow: 40, flatRoadmaps: false },
  compact: { gap: 12, nextPadding: 11, mascot: 92, coach: 15.5, stepTitle: 15, compactButton: true, questRow: 30, flatRoadmaps: true },
};
function HomeScreen({ mode, roadmapId, onSelect, onRoadmap, onPlay, onStreak, onCreateAi, onCreateManual, onExplore }: { mode: ThemeMode; roadmapId?: string; onSelect: (tab: MainTab) => void; onRoadmap: (id: string) => void; onPlay: (roadmapId: string, stepId: string) => void; onStreak: () => void; onCreateAi: (goal?: string) => void; onCreateManual: () => void; onExplore: () => void }) {
  const p = palette[mode];
  const profile = useApi<Profile>('/me');
  const progress = useApi<Progress>('/me/progress');
  const league = useApi<League>('/me/league', LEAGUE_REFETCH_MS);
  const { roadmaps, focus } = useFocusRoadmap(roadmapId);
  const [createOpen, setCreateOpen] = useState(false);
  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const screen = useWindowDimensions();
  const size = homeSizes[screen.height < 780 ? 'compact' : 'regular'];
  // The four blocks rise in when Home's data first arrives this session; after that Home opens already in place.
  const enter = useEnterOnce('home:enter');
  if (!profile.data || !progress.data || !roadmaps.data) {
    return (
      <MainScaffold mode={mode} active="home" onSelect={onSelect}>
        <Pending p={p} error={profile.error ?? progress.error ?? roadmaps.error} />
      </MainScaffold>
    );
  }
  const { streak, level, quests } = progress.data;
  const next = focus?.next_step;
  const minutesLeft = 24 * 60 - now.getHours() * 60 - now.getMinutes();
  return (
    <MainScaffold mode={mode} active="home" onSelect={onSelect}>
      {/* One line of progress: the level bar takes what's left after the streak and league chips. */}
      <Animated.View entering={enter(0)} style={[styles.homeHeader, { marginBottom: size.gap }]}>
        <HomeLevel p={p} level={level} onPress={() => onSelect('profile')} />
        <View style={[styles.row, { gap: 5 }]}>
          <HeaderStat p={p} label="Your streak" icon="flame" color={p.streak} value={streak.current} seenKey="home:streak" celebrate onPress={onStreak} />
          <HeaderStat p={p} label="Your league" icon="trophy" color={p.success} value={league.data?.me?.rank} prefix="#" seenKey="home:rank" onPress={() => onSelect('league')} />
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ gap: size.gap - 4, marginBottom: size.gap }}>
        <View style={[styles.row, { gap: 16 }]}>
          <MascotPlaceholder size={size.mascot} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[styles.row, { gap: 5 }]}>
              <Icon name={greeting.icon} color={p.accentText} size={14} />
              <GText numberOfLines={1} weight={700} style={{ color: p.accentText, fontSize: 13, flexShrink: 1 }}>{`${greeting.label}, ${firstName(profile.data)}`}</GText>
            </View>
            <GText weight={800} style={{ color: p.ink, fontSize: size.coach, lineHeight: size.coach + 6 }}>{streakLine(streak.current)}</GText>
          </View>
        </View>
        <Card p={p} style={{ gap: 12, padding: size.nextPadding }}>
          {focus ? (
            <Pressable onPress={() => onRoadmap(focus.id)} style={({ pressed }) => [{ gap: 3 }, pressed && { opacity: 0.8 }]}>
              <View style={[styles.row, { gap: 6 }]}>
                <Overline p={p}>Up next</Overline>
                <Icon name={LOOKS[focus.category].icon} color={p.muted} size={12} />
                <GText numberOfLines={1} weight={600} style={{ color: p.muted, fontSize: 11.5, flex: 1 }}>{focus.title}</GText>
              </View>
              {/* A new step since Home last showed (one was just finished) fades in. */}
              <FadeOnChange seenKey="home:next" id={next?.id ?? 'done'}>
                <View style={[styles.row, { gap: 10 }]}>
                  <GText numberOfLines={1} weight={800} style={{ color: p.ink, fontSize: size.stepTitle, flex: 1 }}>{next?.title ?? 'All done for now'}</GText>
                  {next ? <StepMeta icon="clock" label={`${next.minutes} min`} color={p.muted} /> : null}
                  {next ? <StepMeta icon="star" label={`+${next.xp} XP`} color={p.streak} /> : null}
                </View>
              </FadeOnChange>
            </Pressable>
          ) : (
            <GText weight={700} style={{ color: p.muted, fontSize: size.stepTitle }}>Pick your first quest</GText>
          )}
          {focus && next ? <PrimaryButton icon="play" label="Start step" onPress={() => onPlay(focus.id, next.id)} p={p} compact={size.compactButton} style={{ boxShadow: `0 8px 22px ${p.accentDeep}55` }} /> : null}
          {focus ? null : <PrimaryButton icon="plus" label="Create a roadmap" onPress={() => setCreateOpen(true)} p={p} compact={size.compactButton} style={{ boxShadow: `0 8px 22px ${p.accentDeep}55` }} />}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(2)} style={styles.sectionBlock}>
        <SectionTitle p={p} right={<View style={[styles.timerPill, { backgroundColor: p.surface, borderColor: p.border }]}><Icon name="clock" color={p.muted} size={13} /><GText weight={700} style={{ color: p.muted, fontSize: 11.5 }}>{`${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left`}</GText></View>}>Today&apos;s quests</SectionTitle>
        <Card p={p} style={styles.questList}>
          {quests.map((quest) => <QuestRow key={quest.code} p={p} height={size.questRow} code={quest.code} done={quest.done} title={quest.title} count={quest.target > 1 ? `${quest.progress} of ${quest.target}` : undefined} xp={`+${quest.xp} XP`} />)}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)} style={styles.sectionBlock}>
        <SectionTitle p={p} right={<SectionLink p={p} icon="plus" label="Add roadmap" onPress={() => setCreateOpen(true)} />}>Your roadmaps</SectionTitle>
        <View style={styles.roadmapCards}>
          {roadmaps.data.map((roadmap) => <RoadmapMini key={roadmap.id} p={p} flat={size.flatRoadmaps} roadmap={roadmap} onPress={() => onRoadmap(roadmap.id)} />)}
        </View>
        {roadmaps.data.length === 0 ? (
          <Card p={p} onPress={() => setCreateOpen(true)} style={styles.emptyCard}>
            <GText weight={600} style={{ color: p.muted, fontSize: 12.5 }}>No roadmaps yet. Describe a goal and AI builds one, or pick one from Explore.</GText>
          </Card>
        ) : null}
      </Animated.View>
      <CreateSheet mode={mode} visible={createOpen} onClose={() => setCreateOpen(false)} onAi={onCreateAi} onManual={onCreateManual} onExplore={onExplore} />
    </MainScaffold>
  );
}

// Home's level bar. It fills in XP earned since Home last showed it, from empty after a level-up (keyed by level, so a
// level-up that lands while Home is open starts a fresh bar).
function HomeLevel({ p, level, onPress }: { p: Palette; level: Level; onPress: () => void }) {
  const fill = useFillFrom('home:level', (level.into_level / level.span) * 100, level.level);
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      <LevelBar key={level.level} p={p} level={level} trackColor={p.border} compact initial={fill.initial} delay={fill.delay} />
    </PressableScale>
  );
}

// Streak and league in Home's header: tinted chips in their role color. A value that changed since Home last showed it
// rolls in once Home has settled; with `celebrate`, a value that went up (a longer streak) also bumps the icon.
function HeaderStat({ p, label, icon, color, value, prefix = '', seenKey, celebrate = false, onPress }: { p: Palette; label: string; icon: IconName; color: string; value?: number; prefix?: string; seenKey: string; celebrate?: boolean; onPress: () => void }) {
  const stat = useLanding(seenKey, value, landing.stat);
  const rose = celebrate && stat.landed && stat.shown !== undefined && stat.previous !== undefined && stat.shown > stat.previous;
  const glyph = <Icon name={icon} color={color} size={15} />;
  return (
    <PressableScale scale={0.95} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.headerStat, { backgroundColor: `${color}1F`, borderColor: `${color}38` }]}>
      {rose ? <Bump to={1.3}>{glyph}</Bump> : glyph}
      <RollingText text={stat.shown === undefined ? '–' : `${prefix}${stat.shown}`} pending={stat.pending} landed={stat.landed} weight={800} style={{ color, fontSize: 13.5 }} />
    </PressableScale>
  );
}

// Level progress has its own look wherever it appears (Home, step complete) without a card around it: purple "Level 12"
// and gold for the XP left, plus a purple badge on step complete. The light palette's purples keep the badge's white
// number readable in both themes.
const levelGradient = [palette.light.primary, palette.light.primaryDeep] as const;

// Home squeezes this bar into its one-line header (`compact`), where the level title is cut short before the XP left.
// Pass a track that shows on the page background there.
// `initial` and `delay` pass through to the bar, for filling in XP earned since the screen last showed it.
function LevelBar({ p, level, trackColor, compact = false, initial, delay }: { p: Palette; level: Level; trackColor?: string; compact?: boolean; initial?: number; delay?: number }) {
  return (
    <View style={{ flexGrow: 1, flexShrink: 1, gap: compact ? 6 : 7 }}>
      <View style={[styles.spaceBetween, { gap: 8 }]}>
        <GText numberOfLines={1} weight={800} style={{ color: p.primaryText, fontSize: compact ? 12.5 : 13.5, flexShrink: 1 }}>{`Level ${level.level}`}<GText weight={700} style={{ color: p.muted }}>{`  ·  ${level.title}`}</GText></GText>
        <View style={[styles.row, { gap: 4 }]}>
          <Icon name="star" color={p.streak} size={compact ? 11 : 12} />
          <GText weight={700} style={{ color: p.streak, fontSize: compact ? 11 : 11.5 }}>{`${level.span - level.into_level} XP to go`}</GText>
        </View>
      </View>
      <ProgressBar value={(level.into_level / level.span) * 100} p={p} color={p.streak} trackColor={trackColor} height={compact ? 6 : 8} initial={initial} delay={delay} />
    </View>
  );
}

// `gained` is the XP just earned: after `delay` the bar fills from where it stood before it. Crossing into a new level
// fills from empty instead, pops the badge and adds a "Level up!" pill.
function LevelProgress({ p, level, gained, delay }: { p: Palette; level: Level; gained?: number; delay?: number }) {
  const before = level.into_level - (gained ?? 0);
  const levelledUp = before < 0;
  const badge = (
    <LinearGradient colors={levelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.levelBadge}>
      <GText weight={800} style={{ color: '#fff', fontSize: 15 }}>{level.level}</GText>
    </LinearGradient>
  );
  const row = (
    <View style={styles.levelProgress}>
      {levelledUp ? <Pop delay={delay}>{badge}</Pop> : badge}
      <LevelBar p={p} level={level} initial={gained ? (Math.max(0, before) / level.span) * 100 : undefined} delay={delay} />
    </View>
  );
  if (!levelledUp) return row;
  return (
    <View style={{ gap: 8 }}>
      <LevelUpPill p={p} delay={delay} />
      {row}
    </View>
  );
}

// One line per quest inside a shared card. A finished quest reads as a win: tinted green with a cheer, not struck through.
// A quest finished since Home last showed it lands a moment after Home opens: the box pops green, the title and reward
// cross-fade to their finished look, the row tint fades in and the XP floats up. The keyed parts swap on that change.
function QuestRow({ p, height, code, title, count, xp, done = false }: { p: Palette; height: number; code: string; title: string; count?: string; xp: string; done?: boolean }) {
  const box = Math.min(24, height - 12);
  const quest = useLanding(`quest:${code}`, done, landing.quest);
  const swap = useSwap(quest);
  const won = quest.shown;
  return (
    <Animated.View style={[styles.questRow, { minHeight: height, backgroundColor: won ? `${p.success}1C` : `${p.success}00` }, tintFade]}>
      <Animated.View
        key={`box-${won}`}
        entering={won ? swap.pop : swap.fade}
        exiting={swap.exit}
        style={[styles.checkbox, { width: box, height: box, borderRadius: box * 0.3 }, won ? { backgroundColor: p.success, borderColor: p.success } : { backgroundColor: p.sunken, borderColor: p.borderStrong }]}>
        {won ? <Animated.View entering={swap.check}><Icon name="check" color={palette.dark.bg} size={box * 0.62} /></Animated.View> : null}
      </Animated.View>
      <Animated.View key={`title-${won}`} entering={swap.fade} exiting={swap.exit} style={{ flex: 1 }}>
        <GText numberOfLines={1} weight={won ? 700 : 600} style={{ color: won ? p.success : p.ink, fontSize: 13.5 }}>
          {title}
          {count && !won ? <GText weight={600} style={{ color: p.muted, fontSize: 12 }}>{`  ${count}`}</GText> : null}
        </GText>
      </Animated.View>
      <Animated.View key={`xp-${won}`} entering={swap.fade} exiting={swap.exit}>
        <GText weight={700} style={{ color: won ? p.success : p.streak, fontSize: 11.5 }}>{won ? `${xp} earned` : xp}</GText>
        {won && quest.landed ? <XpFloat text={xp} color={p.streak} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

// Each roadmap carries its own color and icon, so the cards don't all read as the same plum box.
// `flat` puts the icon beside the title, for short phones where the full card would slide under the bottom nav.
function RoadmapMini({ p, flat = false, roadmap, onPress }: { p: Palette; flat?: boolean; roadmap: RoadmapSummary; onPress: () => void }) {
  const { icon, tint } = LOOKS[roadmap.category];
  const color = p[tint];
  const subtitle = `${roadmap.done_steps} of ${roadmap.total_steps} ${roadmap.kind === 'habit' ? 'today' : 'steps'}`;
  const percent = roadmap.total_steps ? (roadmap.done_steps / roadmap.total_steps) * 100 : 0;
  // Steps done since Home last showed this roadmap fill in.
  const fill = useFillFrom(`roadmap:${roadmap.id}`, percent);
  const text = (
    <View style={flat ? { flex: 1 } : null}>
      <GText numberOfLines={1} weight={700} style={{ color: p.ink, fontSize: flat ? 13 : 13.5 }}>{roadmap.title}</GText>
      <GText numberOfLines={1} style={{ color: p.muted, fontSize: 11, marginTop: 2 }}>{subtitle}</GText>
    </View>
  );
  return (
    <Card p={p} onPress={onPress} style={[styles.roadmapMini, flat && { padding: 10 }, { backgroundColor: `${color}1F`, borderColor: `${color}45` }]}>
      {flat ? (
        <View style={[styles.row, { gap: 8 }]}>
          <IconTile icon={icon} color={color} backgroundColor={`${color}2E`} size={28} rounded={10} textSize={14} />
          {text}
        </View>
      ) : (
        <>
          <IconTile icon={icon} color={color} backgroundColor={`${color}2E`} size={32} rounded={11} textSize={16} />
          {text}
        </>
      )}
      <ProgressBar value={percent} p={p} color={color} height={6} initial={fill.initial} delay={fill.delay} />
    </Card>
  );
}

function RoadmapScreen({ mode, roadmapId, onSelect, onBack, onPlay }: { mode: ThemeMode; roadmapId?: string; onSelect: (tab: MainTab) => void; onBack: () => void; onPlay: (roadmapId: string, stepId: string) => void }) {
  const p = palette[mode];
  const { roadmaps, focus } = useFocusRoadmap(roadmapId);
  const roadmap = useApi<Roadmap>(focus ? `/roadmaps/${focus.id}` : null);
  const progress = useApi<Progress>('/me/progress');
  const next = roadmap.data?.next_step;
  const step = useApi<Step>(next ? `/steps/${next.id}` : null);
  if (!roadmap.data) {
    return (
      <MainScaffold mode={mode} active="continue" onSelect={onSelect}>
        {roadmaps.data?.length === 0 ? (
          <View style={styles.pending}>
            <GText weight={600} style={{ color: p.muted, fontSize: 13.5, textAlign: 'center' }}>No roadmaps yet.</GText>
            <PrimaryButton label="Find one in Explore" onPress={() => onSelect('explore')} p={p} compact />
          </View>
        ) : (
          <Pending p={p} error={roadmaps.error ?? roadmap.error} />
        )}
      </MainScaffold>
    );
  }
  return (
    <MainScaffold mode={mode} active="continue" onSelect={onSelect} noScroll>
      {/* Keyed so each roadmap keeps its own first visit and "since last time" state. */}
      <RoadmapPath key={roadmap.data.id} p={p} data={roadmap.data} streak={progress.data?.streak.current ?? 0} exercises={step.data?.exercises.length} onBack={onBack} onPlay={onPlay} />
    </MainScaffold>
  );
}

// The current unit as a path: done steps, the next-step card, locked steps and the unit checkpoint. See `usePathMotion`
// for when it animates.
function RoadmapPath({ p, data, streak, exercises, onBack, onPlay }: { p: Palette; data: Roadmap; streak: number; exercises?: number; onBack: () => void; onPlay: (roadmapId: string, stepId: string) => void }) {
  const next = data.next_step;
  const unit = data.units.find((item) => item.steps.some((candidate) => !candidate.done)) ?? data.units[data.units.length - 1];
  const nextIndex = unit.steps.findIndex((candidate) => candidate.id === next?.id);
  const steps = unit.steps.slice(Math.max(0, nextIndex - 2));
  const map = layoutPath(steps.map((candidate) => candidate.id === next?.id));
  const walked = map.points.slice(0, next ? map.cardIndex + 1 : map.points.length);
  const percent = (data.done_steps / data.total_steps) * 100;
  const motion = usePathMotion(data.id, next?.id ?? null, percent);
  // The walked path draws on from the node of the step just finished, when it sits before the card in this unit.
  const finishedAt = steps.findIndex((candidate) => candidate.id === motion.finished);
  const walkedFrom = finishedAt >= 0 && finishedAt < map.cardIndex ? pathLength(map.points.slice(0, finishedAt + 1)) : undefined;
  return (
    <>
      <View style={styles.compactHeader}>
        <BackButton p={p} onPress={onBack} />
        <View style={{ flex: 1 }}>
          <GText numberOfLines={1} weight={800} style={{ color: p.ink, fontSize: 17 }}>{data.title}</GText>
          <GText numberOfLines={1} style={{ color: p.muted, fontSize: 11.5 }}>{`Unit ${unit.position + 1} of ${data.unit_count} · ${unit.title}`}</GText>
        </View>
        <View style={[styles.streakPill, { backgroundColor: p.surface, borderColor: p.border }]}>
          <GText style={{ fontSize: 13 }}>🔥</GText><GText weight={700} style={{ color: p.streak, fontSize: 12 }}>{streak}</GText>
        </View>
      </View>
      <View style={styles.roadmapProgress}>
        <View style={{ flex: 1 }}><ProgressBar value={percent} p={p} height={6} initial={motion.fill.initial} delay={motion.fill.delay} /></View>
        <GText weight={700} style={{ color: p.primaryText, fontSize: 11 }}>{`${data.done_steps} / ${data.total_steps}`}</GText>
      </View>
      {next ? (
        <ScrollBody bottomInset={105}>
          <View style={[styles.pathMap, { height: map.height }]}>
            <Svg width={MAP_WIDTH} height={map.height} viewBox={`0 0 ${MAP_WIDTH} ${map.height}`} style={StyleSheet.absoluteFill}>
              <Path d={pathThrough(map.points)} stroke={p.border} strokeWidth={16} strokeLinecap="round" fill="none" />
              <WalkedPath key={next.id} points={walked} from={walkedFrom} stroke={`${p.primary}66`} />
            </Svg>

            {steps.map((candidate, index) => (candidate.id === next.id ? null : <PathNode key={candidate.id} p={p} x={map.points[index].x} y={map.points[index].y} locked={!candidate.done} entering={motion.node(index, candidate.id)} />))}

            <Animated.View key={next.id} entering={motion.card(map.cardIndex)} style={{ position: 'absolute', left: GUTTER, right: GUTTER, top: map.cardTop }}>
              <GradientCard colors={[p.raised, p.surface]} style={[styles.nextStepCard, { borderColor: p.primaryDeep }]}>
                <View style={styles.nextStepTop}>
                  <PulseButton color={p.primary} size={53} label="Start step" onPress={() => onPlay(data.id, next.id)}>
                    <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.playButton}>
                      <Icon name="play" color={p.bg} size={22} />
                    </LinearGradient>
                  </PulseButton>
                  <View style={{ flex: 1 }}>
                    <GText weight={700} style={[styles.upNext, { color: p.primaryText, backgroundColor: `${p.primary}25` }]}>{`STEP ${data.done_steps + 1} · UP NEXT`}</GText>
                    <GText numberOfLines={2} weight={800} style={{ color: p.ink, fontSize: 16, marginTop: 6 }}>{next.title}</GText>
                    {next.summary ? <GText numberOfLines={2} style={{ color: p.muted, fontSize: 11.5, lineHeight: 17, marginTop: 2 }}>{next.summary}</GText> : null}
                  </View>
                </View>
                <View style={[styles.stepMeta, { borderColor: p.borderStrong }]}>
                  <StepMeta icon="clock" label={`${next.minutes} min`} color={p.muted} />
                  <StepMeta icon="checklist" label={exercises === undefined ? 'Exercises' : plural(exercises, 'exercise')} color={p.muted} />
                  <StepMeta icon="star" label={`+${next.xp} XP`} color={p.streak} />
                </View>
                <PrimaryButton label="Start step" onPress={() => onPlay(data.id, next.id)} p={p} compact />
              </GradientCard>
            </Animated.View>

            <Landmark p={p} x={map.checkpoint.x} y={map.checkpoint.y} size={62} color={p.success} label={`Unit ${unit.position + 1} checkpoint`} entering={motion.node(steps.length)}><TrophyIcon color={p.success} /></Landmark>
          </View>
        </ScrollBody>
      ) : (
        <View style={styles.pending}>
          <Landmark p={p} x={65} y={40} size={62} color={p.success} label={data.kind === 'habit' ? 'All done today' : 'Roadmap complete'} entering={motion.celebrate ? motion.trophy : undefined} glow={motion.celebrate}><TrophyIcon color={p.success} /></Landmark>
          <GText weight={600} style={{ color: p.muted, fontSize: 13.5, textAlign: 'center', marginTop: 90 }}>{data.kind === 'habit' ? 'Every step is done for today. Come back tomorrow.' : 'You finished every step. Nice work.'}</GText>
        </View>
      )}
    </>
  );
}

function StepMeta({ icon, label, color }: { icon: IconName; label: string; color: string }) {
  return (
    <View style={[styles.row, { gap: 4 }]}>
      <Icon name={icon} color={color} size={13} />
      <GText weight={700} style={{ color, fontSize: 11 }}>{label}</GText>
    </View>
  );
}

const MAP_WIDTH = 390;
const NODE_X = [195, 268, 195, 122];
const NODE_GAP = 72;
const CARD_SPAN = 280;

type Point = { x: number; y: number };

function layoutPath(isCard: boolean[]) {
  const points: Point[] = [];
  let y = 40;
  let cardTop = 0;
  isCard.forEach((card, index) => {
    if (card) {
      cardTop = y - 26;
      points.push({ x: 195, y: y + 100 });
      y += CARD_SPAN;
    } else {
      points.push({ x: NODE_X[index % NODE_X.length], y });
      y += NODE_GAP;
    }
  });
  const checkpoint = { x: 195, y: y + 10 };
  return { points: [...points, checkpoint], cardIndex: isCard.indexOf(true), cardTop, checkpoint, height: y + 70 };
}

function centeredAt(x: number, y: number, width: number, height = width) {
  return { left: x - width / 2, top: y - height / 2, width, height };
}

function PathNode({ p, x, y, locked, entering }: { p: Palette; x: number; y: number; locked?: boolean; entering?: Entering }) {
  return (
    <Animated.View
      entering={entering}
      style={[
        styles.pathNode,
        centeredAt(x, y, 52),
        locked
          ? { backgroundColor: p.surface, borderColor: p.bg, outlineColor: p.border, outlineWidth: 2 }
          : { backgroundColor: p.primary, borderColor: p.bg, boxShadow: `0 4px 0 ${p.primaryDeep}` },
      ]}
    >
      {locked ? <LockIcon color={p.border} /> : <CheckIcon color={p.bg} />}
    </Animated.View>
  );
}

function Landmark({
  p,
  x,
  y,
  size,
  color,
  labelColor = color,
  label,
  dashed,
  entering,
  glow = false,
  children,
}: {
  p: Palette;
  x: number;
  y: number;
  size: number;
  color: string;
  labelColor?: string;
  label: string;
  dashed?: boolean;
  entering?: Entering;
  // A soft one-time glow behind the diamond, for a landmark that was just reached.
  glow?: boolean;
  children: React.ReactNode;
}) {
  const width = 130;
  const height = size + 6 + 12;
  const halo = size * 1.6;
  return (
    <Animated.View entering={entering} style={[styles.landmark, { left: x - width / 2, top: y - height / 2, width }]}>
      {glow ? <Glow color={color} size={halo} style={{ top: (size - halo) / 2, left: (width - halo) / 2 }} /> : null}
      <View
        style={[
          styles.landmarkDiamond,
          {
            width: size,
            height: size,
            borderRadius: size * 0.29,
            borderColor: color,
            borderStyle: dashed ? 'dashed' : 'solid',
            backgroundColor: p.surface,
          },
        ]}
      >
        <View style={{ transform: [{ rotate: '-45deg' }] }}>{children}</View>
      </View>
      <GText weight={700} style={[styles.landmarkLabel, { color: labelColor }]}>{label.toUpperCase()}</GText>
    </Animated.View>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M10 3L11.9 8.1L17 10L11.9 11.9L10 17L8.1 11.9L3 10L8.1 8.1Z" fill={color} />
      <Path d="M18 14L18.9 16.1L21 17L18.9 17.9L18 20L17.1 17.9L15 17L17.1 16.1Z" fill={color} />
    </Svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={15} viewBox="0 0 14 11" fill="none">
      <Path d="M1 5.5L5 9.5L13 1.5" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={19} viewBox="0 0 18 20" fill="none">
      <Rect x={2} y={8} width={14} height={10} rx={3} fill={color} />
      <Path d="M5.5 8V6A3.5 3.5 0 0 1 12.5 6V8" stroke={color} strokeWidth={2.4} />
    </Svg>
  );
}

function TrophyIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 22 22" fill="none">
      <Path d="M5 4H17V9A6 6 0 0 1 5 9Z" stroke={color} strokeWidth={2} />
      <Path d="M8 19H14M11 15V19" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5 6H2.5A2.5 2.5 0 0 0 5 10M17 6H19.5A2.5 2.5 0 0 1 17 10" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function StepScreen({ stepId, onClose, onDone }: { stepId: string; onClose: () => void; onDone: (result: StepResult) => void }) {
  const p = palette.dark;
  const step = useApi<Step>(`/steps/${stepId}`);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number>();
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [stripSpace, setStripSpace] = useState(0);
  const [startedAt] = useState(Date.now);
  const { busy, error, run } = useAction();
  const close = <CloseButton p={p} onPress={onClose} />;
  if (!step.data) {
    return (
      <ScreenFrame mode="dark">
        <View style={styles.sessionHeader}>{close}</View>
        <Pending p={p} error={step.error} />
      </ScreenFrame>
    );
  }
  const data = step.data;
  const exercise = data.exercises[index];
  const quiz = exercise?.kind === 'quiz' ? exercise : undefined;
  const last = index + 1 >= data.exercises.length;
  const finish = () => run(async () => {
    const completion = await send<Completion>(`/steps/${stepId}/complete`, 'POST');
    const quizzes = data.exercises.filter((item) => item.kind === 'quiz').length;
    onDone({ completion, title: data.title, correct, quizzes, seconds: Math.round((Date.now() - startedAt) / 1000) });
  });
  const advance = () => {
    if (last) return finish();
    setIndex(index + 1);
    setPicked(undefined);
    setRevealed(false);
  };
  const check = () => {
    if (picked === quiz?.answer) setCorrect(correct + 1);
    setRevealed(true);
    (picked === quiz?.answer ? haptic.success : haptic.error)();
  };
  const checking = quiz !== undefined && !revealed;
  return (
    <ScreenFrame mode="dark">
      <View style={styles.sessionHeader}>
        {close}
        <View style={{ flex: 1 }}><ProgressBar value={data.exercises.length ? (index / data.exercises.length) * 100 : 0} p={p} height={10} /></View>
        <View style={[styles.row, { gap: 4 }]}><Icon name="star" color={p.streak} size={15} /><GText weight={700} style={{ color: p.streak, fontSize: 13 }}>{data.xp}</GText></View>
      </View>
      <ContentIn>
        <ScrollBody contentStyle={styles.sessionBody} bottomInset={112 + (revealed && quiz ? stripSpace : 0)}>
          <ExerciseSlide index={index}>
            <View>
              <Overline p={p} style={{ color: p.primaryText, marginBottom: 8 }}>{exercise ? `Exercise ${index + 1} of ${data.exercises.length}` : 'Step'}</Overline>
              <GText weight={800} style={{ color: p.ink, fontSize: 23, lineHeight: 30, letterSpacing: -0.4 }}>{exercise ? exercise.prompt : data.title}</GText>
              {data.summary && !quiz ? <GText style={{ color: p.muted, fontSize: 13.5, lineHeight: 20, marginTop: 8 }}>{data.summary}</GText> : null}
            </View>
            {exercise?.kind === 'timer' ? <Timer key={index} p={p} minutes={exercise.minutes} /> : null}
            {quiz ? (
              <View style={{ gap: 8 }}>
                {quiz.options.map((option, number) => (
                  <AnswerCard
                    key={number}
                    p={p}
                    option={option}
                    number={number}
                    chosen={picked === number}
                    revealed={revealed}
                    isAnswer={number === quiz.answer}
                    onPick={() => {
                      if (picked !== number) haptic.select();
                      setPicked(number);
                    }}
                  />
                ))}
              </View>
            ) : null}
          </ExerciseSlide>
          <ErrorText p={p} error={error} />
        </ScrollBody>
        <ResultDock p={p} result={revealed && quiz ? { correct: picked === quiz.answer, answer: quiz.options[quiz.answer] ?? '' } : undefined} onSpace={setStripSpace}>
          {/* The dock pins this footer to the bottom, so it sits in flow inside it. */}
          <View style={[styles.fixedFooter, { position: 'relative', backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}>
            <PrimaryButton label={checking ? 'Check answer' : last ? 'Finish step' : 'Continue'} onPress={checking ? check : advance} p={p} disabled={busy || (checking && picked === undefined)} tapHaptic={!checking} />
          </View>
        </ResultDock>
      </ContentIn>
    </ScreenFrame>
  );
}

function Timer({ p, minutes }: { p: Palette; minutes: number }) {
  const [endsAt, setEndsAt] = useState<number>();
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : minutes * 60;
  const start = () => {
    // One clock reading for both, or the countdown opens a second high (15:01).
    const startedAt = Date.now();
    setNow(startedAt);
    setEndsAt(startedAt + minutes * 60_000);
  };
  return <TimerCard p={p} text={clock(left)} done={left === 0} started={endsAt !== undefined} onStart={start} />;
}

// Step-complete choreography, in ms from mount. The check pops at 0 (burst at 60); the copy enters at 180, the stats
// from 260 (XP counts up from 300), the level row at 420 (fills from 460) and the streak at 520 (flame bumps at 700).
// Continue works from the first frame: nothing waits on the motion. Index 1 is the reduced-motion (fade-only) set.
const completeAt = { count: 300, fill: 460, flame: 700 };
const completeEnter = [false, true].map((reduced) => ({
  title: enterAt(180, reduced),
  subtitle: enterAt(220, reduced),
  stats: [0, 1, 2].map((index) => enterAt(260 + index * 50, reduced)),
  level: enterAt(420, reduced),
  streak: enterAt(520, reduced),
}));

function CompleteScreen({ result, onContinue }: { result: StepResult; onContinue: () => void }) {
  const p = palette.dark;
  const enter = completeEnter[useReducedMotion() ? 1 : 0];
  const profile = useApi<Profile>('/me');
  const { completion, title, correct, quizzes, seconds } = result;
  const quests = completion.quests_completed.map((quest) => quest.title).join(', ');
  return (
    <ScreenFrame mode="dark">
      <View style={styles.completeBody}>
        <CelebrationCheck p={p} />
        <View style={styles.centeredCopy}>
          <Animated.View entering={enter.title}><GText weight={800} style={{ color: p.ink, fontSize: 25 }}>{profile.data ? `Nice work, ${firstName(profile.data)}` : 'Nice work'}</GText></Animated.View>
          <Animated.View entering={enter.subtitle}><GText style={{ color: p.muted, fontSize: 13.5, marginTop: 8, textAlign: 'center' }}>{quests ? `${title} done. Quest complete: ${quests}.` : `${title} done.`}</GText></Animated.View>
        </View>
        <View style={styles.completeStats}>
          <CompleteStat p={p} value={{ to: completion.xp_awarded, prefix: '+', delay: completeAt.count }} label="XP earned" color={p.streak} entering={enter.stats[0]} />
          <CompleteStat p={p} value={quizzes ? `${correct}/${quizzes}` : '–'} label="Correct" color={p.success} entering={enter.stats[1]} />
          <CompleteStat p={p} value={clock(seconds)} label="Time" color={p.primaryText} entering={enter.stats[2]} />
        </View>
        <View style={{ gap: 14 }}>
          <Animated.View entering={enter.level}><LevelProgress p={p} level={completion.level} gained={completion.xp_awarded} delay={completeAt.fill} /></Animated.View>
          <Animated.View entering={enter.streak} style={styles.streakSecured}><Bump delay={completeAt.flame}><GText style={{ fontSize: 14 }}>🔥</GText></Bump><GText weight={600} style={{ color: p.muted, fontSize: 12 }}>Day <GText weight={800} style={{ color: p.streak }}>{completion.streak.current}</GText> streak secured</GText></Animated.View>
        </View>
      </View>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}><PrimaryButton label="Continue" onPress={onContinue} p={p} /></View>
    </ScreenFrame>
  );
}

// `value` as count props counts up from zero instead of showing a fixed string.
function CompleteStat({ p, value, label, color, entering }: { p: Palette; value: string | CountProps; label: string; color: string; entering?: Entrance }) {
  return (
    <Animated.View entering={entering} style={{ flex: 1 }}>
      <Card p={p} style={styles.completeStat}>
        {typeof value === 'string' ? (
          <GText weight={800} style={{ color, fontSize: 21 }}>{value}</GText>
        ) : (
          <AnimatedCount {...value} style={{ color, fontSize: 21, alignSelf: 'stretch', textAlign: 'center' }} />
        )}
        <Overline p={p} style={{ fontSize: 9.5, marginTop: 4 }}>{label}</Overline>
      </Card>
    </Animated.View>
  );
}

// Bottom sheet over Home and Explore for picking a creation flow. Drag it down, tap the dimmed backdrop or press
// Android back to dismiss. Options navigate at once instead of waiting for the sheet to leave.
function CreateSheet({ mode, visible, onClose, onAi, onManual, onExplore }: { mode: ThemeMode; visible: boolean; onClose: () => void; onAi: (goal?: string) => void; onManual: () => void; onExplore?: () => void }) {
  const p = palette[mode];
  const insets = useSafeAreaInsets();
  // Four blocks rise 30ms apart, so the content has settled about when the sheet has.
  const enter = useStagger(4, 30);
  return (
    <SheetModal visible={visible} onClose={onClose} color={p.raised} style={[styles.createSheet, { backgroundColor: p.raised, borderTopColor: p.borderStrong, paddingBottom: 22 + insets.bottom }]}>
      {(close) => (
        <>
          <View style={[styles.sheetHandle, { backgroundColor: p.subtle }]} />
          <GText weight={800} style={{ color: p.ink, fontSize: 21, marginBottom: 14 }}>Start something new</GText>
          <Animated.View entering={enter[0]}>
            <GradientCard colors={[p.raised, p.surface]} style={[styles.aiCreateCard, { borderColor: p.accent }]}>
              <PressableScale onPress={() => onAi()} style={styles.aiCreateInner}>
                <LinearGradient colors={[p.accent, p.accentDeep]} style={styles.aiCreateIcon}>
                  <Icon name="sparkles" color={palette.dark.bg} size={24} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={[styles.row, { gap: 7 }]}>
                    <GText weight={800} style={{ color: p.ink, fontSize: 15 }}>Build with AI</GText>
                    <View style={[styles.fastestBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 8.5 }}>FASTEST</GText></View>
                  </View>
                  <GText style={{ color: p.muted, fontSize: 11.5, lineHeight: 17, marginTop: 3 }}>Describe a goal in a sentence. Get units, steps and XP.</GText>
                </View>
              </PressableScale>
              <View style={styles.suggestionRow}>
                {['Run a 10k', 'Learn Rust', 'Sleep earlier'].map((label) => <PressableScale key={label} onPress={() => onAi(label)} style={[styles.suggestion, { backgroundColor: `${p.accent}18` }]}><GText weight={600} style={{ color: p.accentText, fontSize: 10.5 }}>{label}</GText></PressableScale>)}
              </View>
            </GradientCard>
          </Animated.View>
          <View style={styles.createOptions}>
            <Animated.View entering={enter[1]} style={{ flex: 1 }}><CreateOption p={p} icon="plus" color={p.primary} title="Build manually" subtitle="Add your own steps and rules." onPress={onManual} /></Animated.View>
            <Animated.View entering={enter[2]} style={{ flex: 1 }}><CreateOption p={p} icon="store" color={p.success} title="From marketplace" subtitle="Fork a ranked roadmap." onPress={onExplore ?? close} /></Animated.View>
          </View>
          <Animated.View entering={enter[3]}>
            <Card p={p} onPress={onManual} style={styles.quickHabit}>
              <IconTile icon="bolt" color={p.streak} backgroundColor={`${p.streak}20`} size={34} rounded={11} textSize={15} />
              <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>Quick habit</GText><GText style={{ color: p.muted, fontSize: 11 }}>One thing, every day. 20 seconds to set up.</GText></View>
              <GText weight={700} style={{ color: p.dim, fontSize: 24 }}>›</GText>
            </Card>
          </Animated.View>
        </>
      )}
    </SheetModal>
  );
}

function CreateOption({ p, icon, color, title, subtitle, onPress }: { p: Palette; icon: IconName; color: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={styles.createOption}>
      <IconTile icon={icon} color={color} backgroundColor={`${color}20`} size={38} rounded={12} textSize={20} />
      <GText weight={700} style={{ color: p.ink, fontSize: 13.5, marginTop: 12 }}>{title}</GText>
      <GText style={{ color: p.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{subtitle}</GText>
    </Card>
  );
}

function AiPromptScreen({ brief, onBack, onGenerate }: { brief: Brief; onBack: () => void; onGenerate: (brief: Brief) => Promise<void> }) {
  const p = palette.dark;
  const [form, setForm] = useState(brief);
  const { busy, error, run } = useAction();
  return (
    <ScreenFrame mode="dark" bottomColor={p.chrome}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5 }}>Build with AI</GText></View>
        <ScrollBody contentStyle={styles.formBody} bottomInset={110}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>What do you want{`\n`}to get good at?</GText>
          <TextInput
            multiline
            value={form.goal}
            onChangeText={(goal) => setForm({ ...form, goal })}
            placeholder="Get comfortable playing piano by ear so I can jam with friends"
            placeholderTextColor={p.dim}
            style={[styles.goalInput, { color: p.ink, borderColor: p.accent, backgroundColor: p.surface, fontFamily: 'JakartaMedium' }]}
          />
          <Overline p={p}>Shape it</Overline>
          <View style={styles.formGrid}>
            <SmallField p={p} label="Timeframe" value={plural(form.weeks, 'week')} onPress={() => setForm({ ...form, weeks: cycle(WEEKS, form.weeks) })} />
            <SmallField p={p} label="Per day" value={`${form.minutes_per_day} min`} onPress={() => setForm({ ...form, minutes_per_day: cycle(MINUTES, form.minutes_per_day) })} />
          </View>
          <Card p={p} style={styles.levelPicker}>
            <Overline p={p} style={{ flex: 1 }}>Starting level</Overline>
            <SegmentedPicker p={p} options={LEVELS} value={form.level} onChange={(level) => setForm({ ...form, level })} />
          </Card>
          <Overline p={p}>Add context (optional)</Overline>
          <TextInput
            multiline
            value={form.context}
            onChangeText={(context) => setForm({ ...form, context })}
            placeholder="What you already know, what you have, what to avoid"
            placeholderTextColor={p.dim}
            style={[styles.contextInput, { color: p.ink, borderColor: p.borderStrong, backgroundColor: p.sunken }]}
          />
          <ErrorText p={p} error={error} />
        </ScrollBody>
        <View style={[styles.fixedFooter, { backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}><PrimaryButton label="Generate roadmap" onPress={() => run(() => onGenerate(form))} p={p} disabled={busy || form.goal.trim().length < 3} /></View>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

function SmallField({ p, label, value, onPress }: { p: Palette; label: string; value: string; onPress: () => void }) {
  return (
    <Card
      p={p}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={styles.smallField}>
      <Overline p={p} style={{ fontSize: 9.5 }}>{label}</Overline>
      <ValueSwap id={value}>
        <GText weight={700} style={{ color: p.ink, fontSize: 13.5, marginTop: 4 }}>{value}</GText>
      </ValueSwap>
    </Card>
  );
}

function AiGeneratingScreen({ runId, onCancel, onFinished }: { runId: string; onCancel: () => void; onFinished: (draft: Draft) => void }) {
  const p = palette.dark;
  const path = `/ai/roadmap-drafts/${runId}`;
  const { data: run } = useQuery({
    queryKey: [path],
    queryFn: () => api<DraftRun>(path),
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  });
  useEffect(() => {
    if (run?.status === 'succeeded' && run.draft) {
      haptic.success();
      onFinished(run.draft);
    }
  }, [run, onFinished]);
  const cancel = () => {
    api(path, 'DELETE').catch(() => undefined);
    onCancel();
  };
  const failed = run?.status === 'failed' || run?.status === 'cancelled';
  const phase = run?.status === 'succeeded' ? 3 : run?.stage === 'steps' ? 2 : run?.stage === 'outline' ? 1 : 0;
  const rows = ['Understanding your goal', 'Shaping the units', 'Writing steps and exercises'];
  return (
    <ScreenFrame mode="dark">
      <View style={styles.generatingBody}>
        <View style={styles.generatingMarkWrap}>
          <SpinnerRing running={!failed} style={[styles.spinnerRing, { borderColor: p.borderStrong, borderTopColor: p.accent }]} />
          <Breathe kind="mark"><LinearGradient colors={[p.accent, p.accentDeep]} style={styles.generatingMark}><Icon name="sparkles" color={p.bg} size={34} /></LinearGradient></Breathe>
        </View>
        <ValueSwap id={failed ? 'failed' : 'running'} kind="fade" style={styles.centeredCopy}>
          <GText weight={800} style={{ color: p.ink, fontSize: 23 }}>{failed ? 'That draft didn’t work out' : 'Drafting your path'}</GText>
          <GText style={{ color: p.muted, fontSize: 13.5, marginTop: 8 }}>{failed ? 'Go back and try again.' : 'This can take a minute.'}</GText>
        </ValueSwap>
        <View style={{ width: '100%', gap: 8 }}>
          {rows.map((label, index) => <GenerationRow key={label} p={p} label={label} state={index < phase ? 'done' : index === phase ? 'active' : 'waiting'} />)}
        </View>
      </View>
      <Pressable onPress={failed ? onCancel : cancel} style={styles.cancelButton}><GText weight={700} style={{ color: p.dim, fontSize: 13.5 }}>{failed ? 'Back' : 'Cancel'}</GText></Pressable>
    </ScreenFrame>
  );
}

function GenerationRow({ p, label, state }: { p: Palette; label: string; state: 'done' | 'active' | 'waiting' }) {
  return (
    <Animated.View style={[styles.generationRow, { backgroundColor: p.surface, borderColor: state === 'active' ? p.accent : p.border, opacity: state === 'waiting' ? 0.55 : 1 }, stateFade]}>
      <Animated.View style={[styles.generationState, state === 'done' ? { backgroundColor: p.success, borderColor: p.success } : { backgroundColor: 'transparent', borderColor: state === 'active' ? p.accent : p.borderStrong }, stateFade]}>
        {state === 'done' ? <PopIn><Icon name="check" color={p.bg} size={14} /></PopIn> : null}
      </Animated.View>
      <GText weight={state === 'active' ? 700 : 600} style={{ color: state === 'done' ? p.success : p.ink, fontSize: 13.2 }}>{label}</GText>
    </Animated.View>
  );
}

function AiReviewScreen({ draft, onBack, onRegenerate, onCreated }: { draft: Draft; onBack: () => void; onRegenerate: () => Promise<void>; onCreated: (id: string) => void }) {
  const p = palette.dark;
  const { busy, error, run } = useAction();
  const steps = draft.units.reduce((sum, unit) => sum + unit.steps.length, 0);
  const start = () => run(async () => onCreated((await send<Roadmap>('/roadmaps', 'POST', draft)).id));
  return (
    <ScreenFrame mode="dark">
      <View style={styles.compactHeader}>
        <BackButton p={p} onPress={onBack} />
        <View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 17 }}>Your draft roadmap</GText><GText style={{ color: p.muted, fontSize: 11.5 }}>Look it over, then start</GText></View>
      </View>
      <ScrollBody contentStyle={styles.reviewBody} bottomInset={110}>
        {/* The draft the user waited for arrives card by card; opening a unit makes the cards below glide. */}
        <Enter index={0} layout>
          <GradientCard colors={[p.raised, p.surface]} style={[styles.summaryCard, { borderColor: p.borderStrong }]}>
            <GText weight={800} style={{ color: p.ink, fontSize: 18 }}>{draft.title}</GText>
            <GText style={{ color: p.muted, fontSize: 12, marginTop: 5 }}>{`${plural(draft.units.length, 'unit')} · ${plural(steps, 'step')} · ${draft.kind === 'habit' ? 'daily habit' : 'course'}`}</GText>
            {draft.summary ? <GText style={{ color: p.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{draft.summary}</GText> : null}
            <View style={styles.tagRow}><TinyTag label={titleCase(draft.category)} color={p.primaryText} bg={`${p.primary}20`} /><TinyTag label={titleCase(draft.level)} color={p.success} bg={`${p.success}20`} /><TinyTag label={`${draft.total_xp.toLocaleString('en-US')} XP`} color={p.streak} bg={`${p.streak}20`} /></View>
          </GradientCard>
        </Enter>
        {draft.units.map((unit, index) => <Enter key={index} index={index + 1} layout><UnitCard p={p} number={index + 1} unit={unit} defaultOpen={index === 0} /></Enter>)}
        <ErrorText p={p} error={error} />
      </ScrollBody>
      <View style={[styles.reviewFooter, { backgroundColor: p.chrome, borderTopColor: p.border }]}>
        <RegenerateTile p={p} disabled={busy} onPress={() => run(onRegenerate)} />
        <View style={{ flex: 1 }}><PrimaryButton label="Start this roadmap" onPress={start} p={p} disabled={busy} /></View>
      </View>
    </ScreenFrame>
  );
}

function TinyTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <View style={[styles.tinyTag, { backgroundColor: bg }]}><GText weight={700} style={{ color, fontSize: 10.5 }}>{label}</GText></View>;
}

function UnitCard({ p, number, unit, defaultOpen }: { p: Palette; number: number; unit: Draft['units'][number]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const minutes = unit.steps.reduce((sum, step) => sum + step.minutes, 0);
  const toggle = () => {
    haptic.select();
    setOpen(!open);
  };
  return (
    <Card p={p} onPress={toggle} style={[styles.unitCard, open ? { borderColor: p.borderStrong } : null]}>
      {/* The first unit arrives open with its card; its steps only animate on later toggles. */}
      <SkipEnterOnMount>
        <View style={styles.row}>
          <IconTile glyph={`${number}`} color={p.primary} backgroundColor={`${p.primary}20`} size={31} rounded={10} textSize={13} />
          <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>{unit.title}</GText><GText style={{ color: p.muted, fontSize: 11 }}>{`${plural(unit.steps.length, 'step')} · ${minutes} min`}</GText></View>
          <Chevron open={open} color={p.dim} />
        </View>
        {open ? <UnitSteps style={styles.unitItems}>{unit.steps.map((step, index) => <UnitStep key={index} index={index} style={[styles.unitItem, { backgroundColor: p.sunken }]}><View style={[styles.bullet, { backgroundColor: p.primary }]} /><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12 }}>{step.title}</GText><GText weight={700} style={{ color: p.streak, fontSize: 11 }}>{`+${step.xp}`}</GText></UnitStep>)}</UnitSteps> : null}
      </SkipEnterOnMount>
    </Card>
  );
}

function ManualScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const p = palette.dark;
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'habit' | 'course'>('habit');
  const [category, setCategory] = useState<Category>('custom');
  // `key` keeps a removed row's exit on that row; `stagger` spaces out a batch of AI suggestions as they arrive.
  const [steps, setSteps] = useState<{ key: number; title: string; minutes: number; stagger: number }[]>([]);
  const [newStep, setNewStep] = useState('');
  const [publish, setPublish] = useState(false);
  const { busy, error, run } = useAction();
  const { icon, tint } = LOOKS[category];
  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps([...steps, { key: newKey(), title: newStep.trim(), minutes: 10, stagger: 0 }]);
    haptic.light();
    setNewStep('');
  };
  const suggest = () => run(async () => {
    const suggestions = await api<StepSuggestions>('/ai/step-suggestions', 'POST', { title: title.trim(), existing_steps: steps.map((step) => step.title), count: 3 });
    setSteps([...steps, ...suggestions.steps.map((step, index) => ({ key: newKey(), title: step.title, minutes: step.minutes, stagger: index }))]);
  });
  const create = () => run(async () => {
    const units = [{ title: title.trim(), steps: steps.map((step) => ({ title: step.title, minutes: step.minutes })) }];
    const roadmap = await send<Roadmap>('/roadmaps', 'POST', { kind, title: title.trim(), category, units });
    if (publish) await send('/marketplace/listings', 'POST', { roadmap_id: roadmap.id });
    onCreated(roadmap.id);
  });
  return (
    <ScreenFrame mode="dark">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5, flex: 1 }}>Build manually</GText></View>
        <ScrollBody contentStyle={styles.formBody} bottomInset={110}>
          <Card p={p} style={styles.manualTitleCard}>
            <PopOnChange trigger={category}><IconTile icon={icon} color={p[tint]} backgroundColor={`${p[tint]}20`} size={46} rounded={16} textSize={22} /></PopOnChange>
            <View style={{ flex: 1 }}>
              <TextInput value={title} onChangeText={setTitle} placeholder="Name your roadmap" placeholderTextColor={p.dim} style={[styles.titleInput, { color: p.ink }]} />
              <GText style={{ color: p.muted, fontSize: 11.5 }}>{kind === 'habit' ? 'Repeats every day' : 'One step at a time, start to finish'}</GText>
            </View>
          </Card>
          <Overline p={p}>Rhythm</Overline>
          <View style={styles.segmentRow}>
            <Pill label="Daily habit" p={p} selected={kind === 'habit'} showCheck={false} onPress={() => setKind('habit')} style={{ flex: 1 }} />
            <Pill label="Course" p={p} selected={kind === 'course'} showCheck={false} onPress={() => setKind('course')} style={{ flex: 1 }} />
          </View>
          <Overline p={p}>Category</Overline>
          <View style={styles.pillWrap}>
            {[...CATEGORIES, 'custom' as const].map((item) => <Pill key={item} label={titleCase(item)} p={p} selected={category === item} showCheck={false} onPress={() => setCategory(item)} />)}
          </View>
          <View style={styles.spaceBetween}>
            <Overline p={p}>Steps</Overline>
            <Pressable disabled={busy || !title.trim()} onPress={suggest} style={!title.trim() ? { opacity: 0.45 } : null}><GText weight={700} style={{ color: p.accent, fontSize: 11.5 }}>Suggest with AI</GText></Pressable>
          </View>
          <View style={{ gap: 9 }}>
            {steps.map((step) => (
              <ListRow key={step.key} stagger={step.stagger}>
                <Card p={p} style={styles.manualStep}>
                  <GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 13 }}>{step.title}</GText>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      haptic.select();
                      setSteps(steps.map((item) => (item.key === step.key ? { ...item, minutes: cycle(MINUTES, item.minutes) } : item)));
                    }}>
                    <ValueSwap id={`${step.minutes}`}><GText weight={700} style={{ color: p.streak, fontSize: 11 }}>{`${step.minutes} min`}</GText></ValueSwap>
                  </Pressable>
                  {/* A small icon needs a deeper press than a card to show it at all. */}
                  <PressableScale scale={0.85} accessibilityLabel="Remove step" hitSlop={8} onPress={() => setSteps(steps.filter((item) => item.key !== step.key))}><Icon name="close" color={p.dim} size={15} /></PressableScale>
                </Card>
              </ListRow>
            ))}
            {/* What sits below the rows glides with them, instead of jumping while they move. */}
            <Animated.View layout={reflow} style={[styles.addManualStep, { borderColor: p.borderStrong }]}>
              <Icon name="plus" color={p.dim} size={15} />
              <TextInput value={newStep} onChangeText={setNewStep} onSubmitEditing={addStep} submitBehavior="submit" returnKeyType="done" placeholder="Add step" placeholderTextColor={p.dim} style={[styles.addStepInput, { color: p.ink }]} />
            </Animated.View>
          </View>
          <Animated.View layout={reflow}>
            <Card p={p} style={styles.publishCard}><IconTile icon="globe" color={p.success} backgroundColor={`${p.success}20`} size={35} rounded={12} textSize={16} /><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Publish to marketplace</GText><GText style={{ color: p.muted, fontSize: 11 }}>Others can fork it and rank it</GText></View><Toggle on={publish} p={p} onPress={() => setPublish(!publish)} /></Card>
          </Animated.View>
          <ErrorText p={p} error={error} />
        </ScrollBody>
        <View style={[styles.fixedFooter, { backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}><PrimaryButton label="Create roadmap" onPress={create} p={p} disabled={busy || !title.trim() || steps.length === 0} /></View>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

const FILTERS = {
  Trending: { params: 'sort=top_week', heading: 'Top this week' },
  'Top rated': { params: 'sort=rating', heading: 'Top rated' },
  New: { params: 'sort=new', heading: 'Just published' },
  Official: { params: 'official=true', heading: 'From the gamify team' },
};
type Filter = keyof typeof FILTERS;

function ExploreScreen({ mode, onSelect, onListing, onCreateAi, onCreateManual }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onListing: (id: string) => void; onCreateAi: (goal?: string) => void; onCreateManual: () => void }) {
  const p = palette[mode];
  const [filter, setFilter] = useState<Filter>('Trending');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { params, heading } = FILTERS[filter];
  const listings = useApi<Listing[]>(`/marketplace/listings?${params}${query ? `&q=${encodeURIComponent(query)}` : ''}`);
  const featured = useApi<Listing[]>('/marketplace/listings?official=true&limit=1').data?.[0];
  const habits = useApi<Listing[]>('/marketplace/listings?kind=habit&limit=2').data ?? [];
  // Entrances play on the first visit this session; coming back to the tab shows everything in place.
  const first = useFirstTime('explore');
  const [titleIn, ctaIn, searchIn, filtersIn, featuredIn, sectionIn] = useEntrances(first, 6, 0, 30);
  const rowsIn = useEntrances(first, 6, 0, 30);
  const listKey = `${filter}|${query}`;
  const [entranceKey] = useState(listKey);
  // The last list that loaded stays up until the next one has data, then the two cross-fade (no empty gap).
  const [shown, setShown] = useState<{ key: string; title: string; data: Listing[]; switched: boolean }>();
  if (listings.data && listings.data !== shown?.data) {
    setShown({ key: listKey, title: query ? 'Results' : heading, data: listings.data, switched: shown !== undefined && shown.key !== listKey });
  }
  return (
    <MainScaffold mode={mode} active="explore" onSelect={onSelect}>
      <Animated.View entering={titleIn}>
        <GText weight={800} style={{ color: p.ink, fontSize: 24, letterSpacing: -0.4 }}>Explore</GText>
      </Animated.View>
      <Animated.View entering={ctaIn}>
        <Pressable accessibilityRole="button" pressRetentionOffset={16} onPress={() => { haptic.light(); setCreateOpen(true); }} style={styles.aiCtaShadow}>
          {({ pressed }) => (
            <>
              {/* A 3D key like PrimaryButton: the lip sits behind the face, which sinks onto it under the finger. */}
              <View style={[StyleSheet.absoluteFill, { top: 5, borderRadius: 22, backgroundColor: p.accentShadow }]} />
              <KeyFace pressed={pressed}>
                <LinearGradient colors={[p.accent, p.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCta}>
                  <View style={[styles.aiCtaIcon, { backgroundColor: `${palette.dark.bg}1A` }]}><SparkleIcon color={palette.dark.bg} /></View>
                  <View style={{ flex: 1 }}>
                    <GText weight={800} style={{ color: palette.dark.bg, fontSize: 18, letterSpacing: -0.2 }}>Add with AI</GText>
                    <GText weight={600} style={{ color: `${palette.dark.bg}B3`, fontSize: 12, marginTop: 2 }}>Describe a goal, get a full roadmap</GText>
                  </View>
                  <Turn turned={pressed} style={[styles.aiCtaPlus, { backgroundColor: palette.dark.bg }]}><GText weight={800} style={{ color: p.accent, fontSize: 22, lineHeight: 24 }}>+</GText></Turn>
                </LinearGradient>
              </KeyFace>
            </>
          )}
        </Pressable>
      </Animated.View>
      <Animated.View entering={searchIn} style={[styles.searchBox, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Icon name="search" color={p.dim} size={19} />
        <TextInput value={text} onChangeText={(value) => { setText(value); if (!value) setQuery(''); }} onSubmitEditing={() => setQuery(text.trim())} returnKeyType="search" placeholder="Search roadmaps, habits, courses" placeholderTextColor={p.dim} style={[styles.searchInput, { color: p.ink }]} />
      </Animated.View>
      <Animated.View entering={filtersIn} style={styles.filterRow}>{(Object.keys(FILTERS) as Filter[]).map((label) => <Pill key={label} label={label} p={p} selected={filter === label} showCheck={false} onPress={() => setFilter(label)} style={{ minHeight: 36, paddingHorizontal: 13 }} />)}</Animated.View>
      {featured && !query ? (
        <Animated.View entering={featuredIn}>
          <PressableScale scale={0.98} onPress={() => onListing(featured.id)}>
            <LinearGradient colors={[p.primaryDeep, p.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureCard}>
              <View style={styles.featureBubble} />
              <View style={[styles.row, { gap: 8 }]}><View style={[styles.officialBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 9 }}>OG · OFFICIAL</GText></View><GText weight={700} style={{ color: '#E4D9FF', fontSize: 10.5 }}>by the gamify team</GText></View>
              <GText weight={800} style={styles.featureTitle}>{featured.title}</GText>
              <GText numberOfLines={2} style={styles.featureDescription}>{featured.summary}</GText>
              <View style={[styles.row, { gap: 16, marginTop: 11 }]}><GText weight={700} style={{ color: '#FFF3B7', fontSize: 11.5 }}>{`★ ${ratingOf(featured)}`}</GText><GText weight={600} style={{ color: '#E4D9FF', fontSize: 11.5 }}>{learners(featured.installs)}</GText></View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      ) : null}
      {/* In the stagger too, or its heading shows alone before everything above it fades in. */}
      <Animated.View entering={sectionIn} style={styles.sectionBlock}>
        {shown && !listings.error ? (
          <Dim dimmed={shown.key !== listKey}>
            <KeyedFade id={shown.key} animate={shown.switched}>
              <SectionTitle p={p}>{shown.title}</SectionTitle>
              {shown.data.map((listing, index) => (
                <Animated.View key={listing.id} entering={shown.key === entranceKey ? rowsIn[index] : undefined}>
                  <RankedRoadmap p={p} rank={index + 1} listing={listing} onPress={() => onListing(listing.id)} />
                </Animated.View>
              ))}
              {shown.data.length === 0 ? <GText style={{ color: p.muted, fontSize: 12.5 }}>Nothing here yet. Build a roadmap and publish it.</GText> : null}
            </KeyedFade>
          </Dim>
        ) : (
          <>
            <SectionTitle p={p}>{query ? 'Results' : heading}</SectionTitle>
            {listings.error ? <ErrorText p={p} error={listings.error.message} /> : null}
            {listings.isPending ? <DelayedSpinner color={p.primary} /> : null}
          </>
        )}
      </Animated.View>
      {habits.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionTitle p={p}>Quick habits</SectionTitle>
          <View style={styles.roadmapCards}>{habits.map((listing) => <QuickHabitCard key={listing.id} p={p} listing={listing} onPress={() => onListing(listing.id)} />)}</View>
        </View>
      ) : null}
      <CreateSheet mode={mode} visible={createOpen} onClose={() => setCreateOpen(false)} onAi={onCreateAi} onManual={onCreateManual} />
    </MainScaffold>
  );
}

const ratingOf = (listing: Listing) => (listing.rating_count ? listing.rating_avg.toFixed(1) : 'New');

function QuickHabitCard({ p, listing, onPress }: { p: Palette; listing: Listing; onPress: () => void }) {
  const { icon, tint } = LOOKS[listing.category];
  const color = p[tint];
  return (
    <Card p={p} onPress={onPress} style={[styles.quickHabitCard, { backgroundColor: `${color}1F`, borderColor: `${color}45` }]}>
      <IconTile icon={icon} color={color} backgroundColor={`${color}2E`} size={32} rounded={11} textSize={15} />
      <GText numberOfLines={1} weight={700} style={{ color: p.ink, fontSize: 12.5, marginTop: 9 }}>{listing.title}</GText>
      <GText style={{ color: p.muted, fontSize: 10.5, marginTop: 3 }}>{learners(listing.installs)}</GText>
    </Card>
  );
}

function RankedRoadmap({ p, rank, listing, onPress }: { p: Palette; rank: number; listing: Listing; onPress: () => void }) {
  const { icon, tint } = LOOKS[listing.category];
  const color = p[tint];
  return (
    <Card p={p} onPress={onPress} style={styles.rankedCard}>
      <GText weight={800} style={{ color: rank === 1 ? p.streak : p.dim, width: 20, fontSize: 13 }}>{rank}</GText>
      <IconTile icon={icon} color={color} backgroundColor={`${color}18`} size={39} rounded={13} textSize={18} />
      <View style={{ flex: 1 }}><GText numberOfLines={1} weight={700} style={{ color: p.ink, fontSize: 13 }}>{listing.title}</GText><GText numberOfLines={1} style={{ color: p.muted, fontSize: 10.8 }}>{`@${nameOf(listing.author)} · ${learners(listing.installs)}`}</GText></View>
      <GText weight={700} style={{ color: p.ink, fontSize: 11.5 }}><GText style={{ color: p.streak }}>★</GText> {ratingOf(listing)}</GText>
    </Card>
  );
}

function CourseScreen({ mode, listingId, onBack, onOpen }: { mode: ThemeMode; listingId: string; onBack: () => void; onOpen: (roadmapId: string) => void }) {
  const p = palette[mode];
  const listing = useApi<ListingDetail>(`/marketplace/listings/${listingId}`);
  const roadmaps = useApi<RoadmapSummary[]>('/roadmaps');
  const profile = useApi<Profile>('/me');
  const [rating, setRating] = useState(0);
  const { busy, error, run } = useAction();
  if (!listing.data) {
    return (
      <ScreenFrame mode={mode}>
        <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /></View>
        <Pending p={p} error={listing.error} />
      </ScreenFrame>
    );
  }
  const data = listing.data;
  const installed = roadmaps.data?.find((roadmap) => roadmap.source_listing_id === data.id);
  const install = () => run(async () => onOpen(installed?.id ?? (await send<Roadmap>(`/marketplace/listings/${data.id}/install`, 'POST')).id));
  const rate = (stars: number) => run(async () => {
    setRating(stars);
    await send(`/marketplace/listings/${data.id}/review`, 'PUT', { rating: stars });
  });
  return (
    <ScreenFrame mode={mode}>
      <ContentIn>
        <ScrollBody contentStyle={{ paddingBottom: 112 }}>
          <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.courseHero}>
            <View style={styles.spaceBetween}><BackButton p={{ ...p, surface: 'rgba(255,255,255,.14)', border: 'rgba(255,255,255,.12)' } as unknown as Palette} onPress={onBack} /></View>
            <View style={[styles.row, { gap: 8, marginTop: 18 }]}>
              {data.is_official ? <View style={[styles.officialBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 9 }}>OG · OFFICIAL</GText></View> : null}
              <GText weight={700} style={{ color: '#E4D9FF', fontSize: 10.5 }}>{data.is_official ? 'gamify team' : `by @${nameOf(data.author)}`}</GText>
            </View>
            <GText weight={800} style={{ color: '#fff', fontSize: 25, lineHeight: 30, marginTop: 12 }}>{data.title}</GText>
            <View style={styles.courseStats}><CourseStat value={ratingOf(data)} label="Rating" /><View style={styles.courseStatDivider} /><CourseStat value={formatCount(data.installs)} label="Learners" /><View style={styles.courseStatDivider} /><CourseStat value={data.content.total_xp.toLocaleString('en-US')} label="Total XP" /></View>
            <View style={styles.featureBubbleLarge} />
          </LinearGradient>
          <View style={styles.courseBody}>
            {data.summary ? <GText style={{ color: p.muted, fontSize: 13, lineHeight: 20 }}>{data.summary}</GText> : null}
            <View style={styles.tagRow}><TinyTag label={plural(data.content.units.length, 'unit')} color={p.muted} bg={p.surface} /><TinyTag label={data.kind === 'habit' ? 'Daily habit' : 'Course'} color={p.muted} bg={p.surface} /><TinyTag label={titleCase(data.category)} color={p.muted} bg={p.surface} /></View>
            <SectionTitle p={p}>What&apos;s inside</SectionTitle>
            <Card p={p} style={styles.courseUnits}>{data.content.units.map((unit, index) => <View key={index} style={[styles.courseUnit, index ? { borderTopColor: p.border, borderTopWidth: 1 } : null]}><IconTile glyph={`${index + 1}`} color={p.primaryText} backgroundColor={`${p.primary}20`} size={30} rounded={9} textSize={12} /><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12.5 }}>{unit.title}</GText><GText style={{ color: p.dim, fontSize: 10.5 }}>{plural(unit.steps.length, 'step')}</GText></View>)}</Card>
            <Card p={p} style={styles.leaderboardCard}>
              <View style={styles.spaceBetween}><GText weight={800} style={{ color: p.ink, fontSize: 14 }}>Leaderboard</GText><GText weight={700} style={{ color: p.accent, fontSize: 10.5 }}>All time</GText></View>
              {data.leaderboard.length === 0 ? <GText style={{ color: p.muted, fontSize: 12, marginTop: 12 }}>No one has earned XP here yet.</GText> : null}
              {data.leaderboard.map((entry, index) => <View key={entry.user_id} style={styles.leaderboardRow}><GText weight={700} style={{ color: index === 0 ? p.streak : p.dim, width: 18, fontSize: 11 }}>{index + 1}</GText><View style={[styles.personDot, { backgroundColor: [p.accent, p.primary, p.success][index] ?? p.raised }]}><GText weight={800} style={{ color: p.bg, fontSize: 10 }}>{initial(entry)}</GText></View><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12 }}>{nameOf(entry)}</GText><GText weight={700} style={{ color: p.primaryText, fontSize: 11.5 }}>{entry.xp.toLocaleString('en-US')}</GText></View>)}
            </Card>
            {installed && profile.data?.id !== data.author.id ? (
              <Card p={p} style={styles.ratingCard}>
                <GText weight={700} style={{ color: p.ink, fontSize: 13, flex: 1 }}>Rate this roadmap</GText>
                {[1, 2, 3, 4, 5].map((stars) => <Pressable key={stars} accessibilityLabel={plural(stars, 'star')} hitSlop={4} disabled={busy} onPress={() => { haptic.light(); rate(stars); }}><RatingStar index={stars} rating={rating} on={p.streak} off={p.borderStrong} size={22} /></Pressable>)}
              </Card>
            ) : null}
            <ErrorText p={p} error={error} />
          </View>
        </ScrollBody>
        <View style={[styles.courseFooter, { backgroundColor: p.chrome, borderTopColor: p.border }]}><View style={{ flex: 1 }}><PrimaryButton label={installed ? 'Open roadmap' : 'Add to my roadmaps'} onPress={install} p={p} disabled={busy} /></View></View>
      </ContentIn>
    </ScreenFrame>
  );
}

function CourseStat({ value, label }: { value: string; label: string }) {
  return <View><GText weight={800} style={{ color: '#fff', fontSize: 16 }}>{value}</GText><GText weight={600} style={{ color: '#E4D9FF', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</GText></View>;
}

function LeagueScreen({ mode, onSelect }: { mode: ThemeMode; onSelect: (tab: MainTab) => void }) {
  const p = palette[mode];
  const league = useApi<League>('/me/league', LEAGUE_REFETCH_MS);
  const [now] = useState(Date.now);
  const first = useFirstTime('league');
  const trophyIn = usePopIn(first, 0, 0.7, 'pop');
  // Rows past the tenth enter with the tenth, so a long league never staggers past ~300ms.
  const rowsIn = useEntrances(first, 11, 60, 30);
  const lastRank = useSeen('league:rank', league.data?.me?.rank);
  if (!league.data) {
    return (
      <MainScaffold mode={mode} active="league" onSelect={onSelect}>
        <Pending p={p} error={league.error} />
      </MainScaffold>
    );
  }
  const { tier_name, entries, me, ends_at, promote, demote } = league.data;
  const daysLeft = Math.max(1, Math.ceil((new Date(ends_at).getTime() - now) / 86_400_000));
  const above = me ? entries.find((entry) => entry.rank === me.rank - 1) : undefined;
  const chase = me && above ? `${above.xp - me.xp} XP from #${above.rank}` : null;
  const timeLeft = `${plural(daysLeft, 'day')} left`;
  const climbed = me && lastRank !== undefined && me.rank < lastRank;
  return (
    <MainScaffold mode={mode} active="league" onSelect={onSelect}>
      <View style={styles.leagueHero}><Animated.View entering={trophyIn}><LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.trophyBadge}><Icon name="trophy" color={p.bg} size={36} /></LinearGradient></Animated.View><GText weight={800} style={{ color: p.ink, fontSize: 21, marginTop: 10 }}>{`${tier_name} League`}</GText><GText style={{ color: p.muted, fontSize: 12.5, marginTop: 7 }}>{promote > 0 ? `Top ${promote} advance · ${timeLeft}` : `${timeLeft} · resets Monday`}</GText></View>
      <View style={{ gap: 8, marginTop: 14 }}>
        {me ? null : <GText style={{ color: p.muted, fontSize: 12.5, textAlign: 'center' }}>{`Finish a step to join this week's ${tier_name} League.`}</GText>}
        {entries.map((entry, index) => {
          const you = entry.user_id === me?.user_id;
          const podium = [p.accent, p.success, p.primary][entry.rank - 1];
          const rankText = (rank: number) => <GText weight={800} style={{ color: rank === 1 ? p.streak : p.dim, width: 20 }}>{rank}</GText>;
          return (
            <Animated.View key={entry.user_id} entering={rowsIn[Math.min(index, 10)]} style={{ gap: 8 }}>
              {entry.rank === entries.length - demote + 1 ? <ZoneLine p={p} label="DEMOTION LINE" color={p.dim} /> : null}
              <Card p={p} style={[styles.playerRow, you ? { borderColor: p.primary, borderWidth: 1.5 } : null]}>
                {/* Your row flashes green and its rank rolls when you've climbed since you last looked. */}
                {you ? <FlashRing play={!!climbed} color={p.success} radius={16} inset={1.5} /> : null}
                {you ? <Swap value={entry.rank} initial={lastRank} motion="roll" render={rankText} /> : rankText(entry.rank)}
                <View style={[styles.playerAvatar, { backgroundColor: podium ?? p.raised }]}><GText weight={800} style={{ color: podium ? p.bg : p.ink, fontSize: 11 }}>{initial(entry)}</GText></View>
                <View style={{ flex: 1 }}><GText weight={you ? 800 : 700} style={{ color: p.ink, fontSize: 13 }}>{you ? 'You' : nameOf(entry)}</GText>{you && chase ? <GText weight={600} style={{ color: p.primaryText, fontSize: 10 }}>{chase}</GText> : null}</View>
                <GText weight={700} style={{ color: you ? p.primaryText : p.muted, fontSize: 12 }}>{entry.xp.toLocaleString('en-US')}</GText>
              </Card>
              {entry.rank === promote ? <ZoneLine p={p} label="PROMOTION LINE" color={p.success} /> : null}
            </Animated.View>
          );
        })}
      </View>
    </MainScaffold>
  );
}

function ZoneLine({ p, label, color }: { p: Palette; label: string; color: string }) {
  return (
    <View style={[styles.row, { gap: 10, marginVertical: 2 }]}>
      <View style={[styles.zoneRule, { backgroundColor: p.border }]} />
      <GText weight={700} style={{ color, fontSize: 10.5, letterSpacing: 0.7 }}>{label}</GText>
      <View style={[styles.zoneRule, { backgroundColor: p.border }]} />
    </View>
  );
}

function StreakScreen({ onBack }: { onBack: () => void }) {
  const p = palette.dark;
  const progress = useApi<Progress>('/me/progress');
  const activity = useApi<DayXp[]>('/me/activity');
  const profile = useApi<Profile>('/me');
  const { busy, error, run } = useAction();
  const insets = useSafeAreaInsets();
  // Each successful freeze replays the snowflake turn and the border flash (they remount on this key).
  const [freezesUsed, setFreezesUsed] = useState(0);
  const header = <View style={styles.spaceBetween}><GText weight={800} style={{ color: p.dim, opacity: 0.5, fontSize: 24 }}>{profile.data?.display_name ?? ''}</GText><Pressable onPress={onBack}><GText weight={800} style={{ color: p.dim, fontSize: 24 }}>×</GText></Pressable></View>;
  if (!progress.data) {
    return (
      <ScreenFrame mode="dark" background={p.overlay}>
        <View style={styles.streakBackdrop}>{header}</View>
        <Pending p={p} error={progress.error} />
      </ScreenFrame>
    );
  }
  const { current, freezes, at_risk, active_today } = progress.data.streak;
  const week = activity.data?.slice(-7) ?? [];
  const [title, body] = at_risk
    ? [`Your ${current}-day streak is waiting`, 'You missed yesterday. It happens. Use a freeze to keep it going.']
    : current === 0
      ? ['Start a streak', 'Finish one step today and day one is on the board.']
      : [`${current}-day streak`, active_today ? 'You showed up today. Come back tomorrow to keep it going.' : 'Finish a step today to keep it going.'];
  // The win lands when the server confirms, before the refetch rewrites the copy.
  const freeze = () => run(async () => {
    await api('/me/streak/freeze', 'POST');
    setFreezesUsed((count) => count + 1);
    haptic.success();
    await queryClient.invalidateQueries();
  });
  return (
    // No bottomColor: the sheet's own color reaches under the home indicator, and leaves with it when dragged away.
    <ScreenFrame mode="dark" background={p.overlay}>
      <View style={styles.streakBackdrop}>{header}<View style={[styles.skeletonLarge, { backgroundColor: p.sunken }]} /><View style={[styles.skeletonSmall, { backgroundColor: p.sunken }]} /></View>
      <SheetPanel onDismiss={onBack} below={insets.bottom} color={p.raised} style={[styles.streakSheet, { backgroundColor: p.raised, borderTopColor: p.borderStrong }]}>
        <View style={[styles.sheetHandle, { backgroundColor: p.subtle }]} />
        {/* The flame ignites once the sheet is mostly up, then breathes. */}
        <PopIn delay={120} style={{ alignSelf: 'center' }}><Breathe kind="flame" delay={570}><GText style={styles.bigFlame}>🔥</GText></Breathe></PopIn>
        <GText weight={800} style={{ color: p.ink, textAlign: 'center', fontSize: 23 }}>{title}</GText>
        <GText style={{ color: p.muted, textAlign: 'center', fontSize: 12.5, lineHeight: 19, marginTop: 8 }}>{body}</GText>
        <View style={styles.weekRow}>
          {week.map((day, index) => {
            const today = index === week.length - 1;
            const active = day.xp > 0;
            return <Appear key={day.day} index={index} style={[styles.dayBox, { backgroundColor: active ? `${p.streak}25` : p.sunken, borderColor: today ? p.dim : 'transparent', borderStyle: today ? 'dashed' : 'solid' }]}><GText weight={700} style={{ color: active ? p.streak : p.dim, fontSize: 10 }}>{new Date(`${day.day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}</GText></Appear>;
          })}
        </View>
        <Card p={p} style={[styles.streakOption, at_risk ? { borderColor: p.primary } : null]}>
          <TurnOnce key={freezesUsed} play={freezesUsed > 0}><IconTile icon="snowflake" color={p.primary} backgroundColor={`${p.primary}20`} size={44} rounded={13} /></TurnOnce>
          <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>Use a streak freeze</GText><GText style={{ color: p.primaryText, fontSize: 11 }}>{at_risk ? `${freezes} left in your pack` : `Saves a missed day · ${freezes} left`}</GText></View>
          <Pressable disabled={busy || !at_risk || freezes === 0} onPress={freeze} style={[styles.useButton, { backgroundColor: p.primary, opacity: at_risk && freezes > 0 ? 1 : 0.4 }]}><GText weight={800} style={{ color: p.bg, fontSize: 12 }}>Use</GText></Pressable>
          <BorderFlash key={`flash-${freezesUsed}`} play={freezesUsed > 0} color={p.primary} radius={18} />
        </Card>
        <ErrorText p={p} error={error} />
        <Pressable onPress={onBack} style={styles.textButton}><GText weight={700} style={{ color: p.dim, fontSize: 12.5 }}>{at_risk ? 'Start fresh instead' : 'Close'}</GText></Pressable>
      </SheetPanel>
    </ScreenFrame>
  );
}

function ProfileScreen({ mode, onSelect, onSettings }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onSettings: () => void }) {
  const p = palette[mode];
  const profile = useApi<Profile>('/me');
  const progress = useApi<Progress>('/me/progress');
  const roadmaps = useApi<RoadmapSummary[]>('/roadmaps');
  const activity = useApi<DayXp[]>('/me/activity');
  const { width } = useWindowDimensions();
  // Heatmap cells per row: the card's inner width (frame capped at 480, gutters, padding, border) over 16pt cells + 4pt gaps.
  const columns = Math.max(1, Math.floor((Math.min(width, 480) - GUTTER * 2 - 32 + 4) / 20));
  const first = useFirstTime('profile');
  const avatarIn = usePopIn(first, 0, 0.85, 'snap');
  const bubbleIn = usePopIn(first, 120, 0.6, 'pop');
  const statsIn = useEntrances(first, 3, 80, 40);
  const cellsIn = useGridEntrance(first, activity.data?.length ?? 0, columns, 160);
  if (!profile.data || !progress.data) {
    return (
      <MainScaffold mode={mode} active="profile" onSelect={onSelect}>
        <Pending p={p} error={profile.error ?? progress.error} />
      </MainScaffold>
    );
  }
  const me = profile.data;
  const finished = roadmaps.data?.filter((roadmap) => roadmap.kind === 'course' && roadmap.done_steps === roadmap.total_steps).length ?? 0;
  const joined = new Date(me.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return (
    <MainScaffold mode={mode} active="profile" onSelect={onSelect}>
      <View style={styles.spaceBetween}><GText weight={800} style={{ color: p.ink, fontSize: 24, letterSpacing: -0.4 }}>Profile</GText><PressableScale scale={0.94} accessibilityLabel="Settings" onPress={onSettings}><IconTile icon="gear" color={p.muted} backgroundColor={p.surface} size={38} rounded={12} /></PressableScale></View>
      <View style={styles.profileIdentity}><View><Animated.View entering={avatarIn}><LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.profileAvatar}><GText weight={800} style={{ color: p.bg, fontSize: 28 }}>{initial(me)}</GText></LinearGradient></Animated.View><Animated.View entering={bubbleIn} style={[styles.levelBubble, { backgroundColor: palette.light.primaryDeep, borderColor: p.bg }]}><GText weight={800} style={{ color: '#fff', fontSize: 9 }}>{progress.data.level.level}</GText></Animated.View></View><View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 20 }}>{me.display_name ?? 'You'}</GText><GText style={{ color: p.muted, fontSize: 11.5, marginTop: 2 }}>{`${me.handle ? `@${me.handle} · ` : ''}joined ${joined}`}</GText></View></View>
      <View style={styles.profileStats}><ProfileStat p={p} value={`${progress.data.streak.current}`} label="Streak" color={p.streak} entering={statsIn[0]} /><ProfileStat p={p} value={formatCount(progress.data.total_xp)} label="Total XP" color={p.primaryText} entering={statsIn[1]} /><ProfileStat p={p} value={`${finished}`} label="Finished" color={p.success} entering={statsIn[2]} /></View>
      <Card p={p} style={styles.activityCard}><View style={styles.spaceBetween}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Last 4 weeks</GText><GText style={{ color: p.dim, fontSize: 10.5 }}>XP per day</GText></View><View style={styles.heatmap}>{activity.data?.map((day, index) => <Animated.View key={day.day} entering={cellsIn[index]} style={[styles.heatCell, { backgroundColor: day.xp === 0 ? p.sunken : day.xp >= me.daily_xp_goal ? p.primary : `${p.primary}80` }]} />)}</View></Card>
    </MainScaffold>
  );
}

function ProfileStat({ p, value, label, color, entering }: { p: Palette; value: string; label: string; color: string; entering?: ReturnType<typeof useEntrances>[number] }) {
  return <Animated.View entering={entering} style={{ flex: 1 }}><Card p={p} style={styles.profileStat}><GText weight={800} style={{ color, fontSize: 19 }}>{value}</GText><Overline p={p} style={{ fontSize: 9, marginTop: 5 }}>{label}</Overline></Card></Animated.View>;
}

function SettingsScreen({ mode, setMode, email, onBack }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void; email: string; onBack: () => void }) {
  const p = palette[mode];
  const profile = useApi<Profile>('/me');
  const { error, run } = useAction();
  const header = <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5 }}>Settings</GText></View>;
  if (!profile.data) {
    return (
      <ScreenFrame mode={mode}>
        {header}
        <Pending p={p} error={profile.error} />
      </ScreenFrame>
    );
  }
  const me = profile.data;
  const save = (changes: Partial<Profile>) => run(() => send('/me', 'PATCH', changes));
  const reminder = REMINDERS.find(({ time }) => time === me.reminder_time)?.label ?? me.reminder_time?.slice(0, 5) ?? 'Off';
  return (
    <ScreenFrame mode={mode}>
      {header}
      {/* Keyed by theme: a fresh body recolors in one frame, where the pressables would otherwise fade their old colors. */}
      <ScrollBody key={mode} contentStyle={styles.settingsBody}>
        <Overline p={p}>Appearance</Overline>
        <View style={styles.themeChoices}><ThemeChoice label="Light" active={mode === 'light'} p={p} preview="light" onPress={() => setMode('light')} /><ThemeChoice label="Dark" active={mode === 'dark'} p={p} preview="dark" onPress={() => setMode('dark')} /><ThemeChoice label="System" active={false} p={p} preview="system" onPress={() => setMode('dark')} /></View>
        <SettingsGroup p={p} title="Account">
          <SettingsInput p={p} label="Name" value={me.display_name ?? ''} onSave={(display_name) => save({ display_name })} />
          <SettingsInput p={p} label="Handle" value={me.handle ?? ''} placeholder="pick_a_handle" autoCapitalize="none" onSave={(handle) => save({ handle: handle.toLowerCase() })} />
          <SettingsLink p={p} label="Email" value={email} />
        </SettingsGroup>
        <SettingsGroup p={p} title="Goals & reminders">
          <SettingsLink p={p} label="Daily XP goal" value={`${me.daily_xp_goal} XP`} onPress={() => save({ daily_xp_goal: cycle(PACES.map(({ goal }) => goal), me.daily_xp_goal) })} />
          <SettingsLink p={p} label="Reminder time" value={reminder} onPress={() => save({ reminder_time: cycle([null, ...REMINDERS.map(({ time }) => time)], me.reminder_time) })} />
        </SettingsGroup>
        <ErrorText p={p} error={error} />
        <Card p={p} onPress={() => supabase.auth.signOut()} style={styles.signOut}><GText weight={700} style={{ color: p.accentText, fontSize: 13.5 }}>Sign out</GText></Card>
      </ScrollBody>
    </ScreenFrame>
  );
}

function ThemeChoice({ label, active, p, preview, onPress }: { label: string; active: boolean; p: Palette; preview: ThemeMode | 'system'; onPress: () => void }) {
  const previewBg = preview === 'dark' ? palette.dark.bg : preview === 'light' ? palette.light.surface : '#F7F1F5';
  const previewInk = preview === 'dark' ? palette.dark.primary : preview === 'light' ? palette.light.primary : palette.dark.bg;
  return <PressableScale onPress={() => { haptic.select(); onPress(); }} style={[styles.themeChoice, { backgroundColor: p.surface, borderColor: active ? p.primary : p.border, borderWidth: active ? 1.5 : 1 }]}><View style={[styles.themePreview, { backgroundColor: previewBg, borderColor: p.border }]}><View style={[styles.previewBar, { backgroundColor: preview === 'system' ? palette.light.surface : p.border }]} /><View style={[styles.previewAccent, { backgroundColor: previewInk }]} /></View><GText weight={active ? 700 : 600} style={{ color: active ? p.primaryText : p.muted, fontSize: 11 }}>{label}</GText></PressableScale>;
}

function SettingsGroup({ p, title, children }: { p: Palette; title: string; children: React.ReactNode }) {
  return <View><Overline p={p} style={{ marginBottom: 10 }}>{title}</Overline><Card p={p} style={styles.settingsGroup}>{children}</Card></View>;
}

function SettingsLink({ p, label, value, onPress }: { p: Palette; label: string; value: string; onPress?: () => void }) {
  const valueText = (text: string) => <GText numberOfLines={1} weight={700} style={{ color: p.primaryText, fontSize: 11.5 }}>{text}</GText>;
  return <HighlightPressable highlight={p.sunken} disabled={!onPress} onPress={onPress} style={[styles.settingRow, { borderBottomColor: p.border }]}><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12.5 }}>{label}</GText><Swap value={value} render={valueText} align="right" style={{ flexShrink: 1 }} />{onPress ? <GText style={{ color: p.dim, fontSize: 22 }}>›</GText> : null}</HighlightPressable>;
}

function SettingsInput({ p, label, value, onSave, ...props }: TextInputProps & { p: Palette; label: string; value: string; onSave: (value: string) => void }) {
  const [text, setText] = useState(value);
  const save = () => {
    if (text.trim() && text.trim() !== value) onSave(text.trim());
  };
  return <View style={[styles.settingRow, { borderBottomColor: p.border }]}><GText weight={600} style={{ color: p.ink, fontSize: 12.5 }}>{label}</GText><TextInput {...props} value={text} onChangeText={setText} onBlur={save} onSubmitEditing={save} placeholderTextColor={p.dim} style={[styles.settingInput, { color: p.primaryText }]} /></View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pending: { flex: 1, minHeight: 320, justifyContent: 'center', gap: 16, padding: GUTTER },
  field: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  fieldInput: { fontFamily: 'JakartaSemiBold', fontSize: 15, paddingVertical: 4, marginTop: 2 },
  welcomeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 34 },
  questMarkWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  questMark: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#8E6EF0', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.42, shadowRadius: 22 },
  star: { fontSize: 54, lineHeight: 62 },
  heroBadge: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadgeTop: { position: 'absolute', top: 8, right: 12 },
  heroBadgeBottom: { position: 'absolute', bottom: 13, left: 5 },
  centeredCopy: { alignItems: 'center' },
  display: { fontSize: 31, lineHeight: 36, letterSpacing: -0.9, textAlign: 'center' },
  heroDescription: { maxWidth: 310, fontSize: 14.5, lineHeight: 23, textAlign: 'center', marginTop: 16 },
  welcomeFooter: { paddingHorizontal: GUTTER, paddingBottom: 20, gap: 13 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 5 },
  longDot: { width: 23, height: 6, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 999 },
  textButton: { alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  onboardingHeader: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 4 },
  onboardingContent: { paddingHorizontal: GUTTER, paddingTop: 14, gap: 12 },
  headingBlock: { gap: 8 },
  screenTitle: { fontSize: 25, lineHeight: 31, letterSpacing: -0.65 },
  screenSubtitle: { fontSize: 14, lineHeight: 21 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  unsureCard: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  fixedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 13, paddingBottom: Platform.OS === 'web' ? 20 : 10 },
  paceCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  minuteTile: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  reminderCard: { padding: 16, gap: 10 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 34, borderRadius: 11, borderWidth: 1 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 36, borderRadius: 999, borderWidth: 1 },
  levelProgress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBadge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionBlock: { gap: 8, marginBottom: 12 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  questList: { padding: 5, gap: 2 },
  questRow: { borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  checkbox: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  roadmapCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roadmapMini: { flexGrow: 1, flexBasis: '40%', padding: 12, gap: 9 },
  emptyCard: { padding: 14 },
  compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 8 },
  roadmapProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingVertical: 8 },
  pathMap: { width: MAP_WIDTH, alignSelf: 'center' },
  pathNode: { position: 'absolute', borderRadius: 999, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  landmark: { position: 'absolute', alignItems: 'center', gap: 6 },
  landmarkDiamond: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  landmarkLabel: { fontSize: 9.5, letterSpacing: 0.6 },
  nextStepCard: { borderRadius: 24, borderWidth: 1.5, padding: 16, boxShadow: '0 14px 34px rgba(0,0,0,0.45)' },
  nextStepTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playButton: { width: 53, height: 53, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  upNext: { alignSelf: 'flex-start', fontSize: 9, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, letterSpacing: 0.6 },
  stepMeta: { flexDirection: 'row', gap: 14, paddingVertical: 11, marginVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 15 },
  sessionBody: { paddingHorizontal: GUTTER, gap: 14 },
  completeBody: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER, gap: 20 },
  completeStats: { flexDirection: 'row', gap: 9 },
  completeStat: { flexGrow: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 18 },
  streakSecured: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  streakBackdrop: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 10, gap: 12 },
  skeletonLarge: { height: 145, borderRadius: 25 },
  skeletonSmall: { height: 58, borderRadius: 20 },
  createSheet: { borderTopWidth: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 28 },
  sheetHandle: { width: 46, height: 5, borderRadius: 999, alignSelf: 'center', marginTop: -10, marginBottom: 18 },
  aiCreateCard: { borderWidth: 1.5, borderRadius: 22, padding: 16 },
  aiCreateInner: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  aiCreateIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  fastestBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  suggestionRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  suggestion: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  createOptions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  createOption: { flex: 1, padding: 15, minHeight: 135 },
  quickHabit: { marginTop: 12, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'center' },
  simpleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 9 },
  formBody: { paddingHorizontal: GUTTER, paddingTop: 12, gap: 10 },
  goalInput: { borderWidth: 1.5, borderRadius: 21, minHeight: 150, padding: 18, fontSize: 14, lineHeight: 22, textAlignVertical: 'top' },
  contextInput: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, minHeight: 84, padding: 14, fontFamily: 'JakartaMedium', fontSize: 12.5, lineHeight: 19, textAlignVertical: 'top' },
  formGrid: { flexDirection: 'row', gap: 10 },
  smallField: { flex: 1, padding: 13, borderRadius: 16 },
  levelPicker: { padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  generatingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 29 },
  generatingMarkWrap: { width: 142, height: 142, alignItems: 'center', justifyContent: 'center' },
  spinnerRing: { position: 'absolute', width: 116, height: 116, borderRadius: 999, borderWidth: 2 },
  generatingMark: { width: 76, height: 76, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  generationRow: { minHeight: 53, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  generationState: { width: 25, height: 25, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { alignItems: 'center', paddingVertical: 18 },
  reviewBody: { paddingHorizontal: GUTTER, gap: 8 },
  summaryCard: { borderWidth: 1, borderRadius: 21, padding: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  tinyTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  unitCard: { padding: 13, borderRadius: 17 },
  unitItems: { gap: 6, paddingTop: 11, paddingLeft: 6 },
  unitItem: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 11, padding: 9 },
  bullet: { width: 6, height: 6, borderRadius: 999 },
  reviewFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 13, paddingBottom: Platform.OS === 'web' ? 20 : 10 },
  manualTitleCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
  titleInput: { fontFamily: 'JakartaExtraBold', fontSize: 16, paddingVertical: 2 },
  manualStep: { padding: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addManualStep: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, paddingHorizontal: 13, paddingVertical: 4 },
  addStepInput: { flex: 1, fontFamily: 'JakartaBold', fontSize: 12.5, paddingVertical: 9 },
  publishCard: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  aiCtaShadow: { borderRadius: 22, paddingBottom: 5, marginTop: 12 },
  aiCta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16 },
  aiCtaIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aiCtaPlus: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 15, height: 48, paddingHorizontal: 14, marginTop: 10 },
  searchInput: { flex: 1, fontFamily: 'JakartaMedium', fontSize: 12.5, height: '100%' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10, marginBottom: 10 },
  featureCard: { borderRadius: 23, padding: 18, overflow: 'hidden', minHeight: 175, marginBottom: 12 },
  featureBubble: { position: 'absolute', width: 150, height: 150, borderRadius: 999, right: -34, bottom: -54, backgroundColor: 'rgba(244,169,140,.22)' },
  officialBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  featureTitle: { color: '#fff', fontSize: 20, lineHeight: 25, marginTop: 13, maxWidth: 290 },
  featureDescription: { color: '#DED2FB', fontSize: 12.5, lineHeight: 19, maxWidth: 275, marginTop: 5 },
  rankedCard: { minHeight: 68, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickHabitCard: { flex: 1, padding: 14, borderRadius: 17 },
  courseHero: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 23, overflow: 'hidden' },
  featureBubbleLarge: { position: 'absolute', width: 170, height: 170, borderRadius: 999, right: -50, top: -25, backgroundColor: 'rgba(244,169,140,.18)' },
  courseStats: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 18 },
  courseStatDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,.25)' },
  courseBody: { paddingHorizontal: GUTTER, paddingVertical: 14, gap: 12 },
  courseUnits: { overflow: 'hidden', paddingHorizontal: 14 },
  courseUnit: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 57 },
  leaderboardCard: { padding: 15 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  personDot: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ratingCard: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 6 },
  courseFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 13, paddingBottom: Platform.OS === 'web' ? 20 : 10 },
  leagueHero: { alignItems: 'center', marginTop: 4, marginBottom: 12 },
  trophyBadge: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  playerRow: { paddingHorizontal: 14, minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoneRule: { flex: 1, height: 1 },
  playerAvatar: { width: 35, height: 35, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  streakSheet: { borderTopWidth: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingBottom: 24, paddingTop: 16 },
  bigFlame: { fontSize: 63, textAlign: 'center', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 12 },
  dayBox: { width: 31, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  streakOption: { minHeight: 78, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  useButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: 15, marginVertical: 14 },
  profileAvatar: { width: 78, height: 78, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  levelBubble: { position: 'absolute', right: -1, bottom: -1, width: 31, height: 24, borderRadius: 999, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  profileStats: { flexDirection: 'row', gap: 9 },
  profileStat: { flex: 1, alignItems: 'center', paddingVertical: 17, borderRadius: 17 },
  activityCard: { padding: 15, marginVertical: 12 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 13 },
  heatCell: { width: 16, height: 16, borderRadius: 4 },
  settingsBody: { paddingHorizontal: GUTTER, paddingTop: 8, gap: 14 },
  themeChoices: { flexDirection: 'row', gap: 9, marginTop: -10 },
  themeChoice: { flex: 1, borderRadius: 17, padding: 10, alignItems: 'center', gap: 9 },
  themePreview: { height: 56, width: '100%', borderRadius: 11, borderWidth: 1, padding: 8, gap: 6 },
  previewBar: { width: '55%', height: 9, borderRadius: 4 },
  previewAccent: { width: '100%', height: 20, borderRadius: 6 },
  settingsGroup: { overflow: 'hidden' },
  settingRow: { minHeight: 53, paddingHorizontal: 15, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingInput: { flex: 1, textAlign: 'right', fontFamily: 'JakartaBold', fontSize: 11.5, paddingVertical: 8 },
  signOut: { padding: 16, alignItems: 'center' },
});
