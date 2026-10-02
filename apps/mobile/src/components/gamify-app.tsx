import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  BackButton,
  Card,
  GUTTER,
  GText,
  GradientCard,
  IconTile,
  MainScaffold,
  type MainTab,
  Overline,
  palette,
  type Palette,
  Pill,
  PrimaryButton,
  ProgressBar,
  ScreenFrame,
  ScrollBody,
  SectionTitle,
  type ThemeMode,
  Toggle,
} from '@/components/gamify-ui';

type ScreenName =
  | 'welcome'
  | 'interests'
  | 'commitment'
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
  | 'achievements'
  | 'settings';

export function GamifyApp() {
  const [screen, setScreen] = useState<ScreenName>('welcome');
  const [mode, setMode] = useState<ThemeMode>('dark');

  const selectMain = (tab: MainTab) => {
    setScreen(tab === 'continue' ? 'roadmap' : tab);
  };

  switch (screen) {
    case 'welcome':
      return <WelcomeScreen onStart={() => setScreen('interests')} onSignIn={() => setScreen('home')} />;
    case 'interests':
      return <InterestsScreen onBack={() => setScreen('welcome')} onContinue={() => setScreen('commitment')} />;
    case 'commitment':
      return <CommitmentScreen onBack={() => setScreen('interests')} onContinue={() => setScreen('home')} />;
    case 'home':
      return <HomeScreen mode={mode} onSelect={selectMain} onRoadmap={() => setScreen('roadmap')} onStreak={() => setScreen('streak')} onCreateAi={() => setScreen('ai-prompt')} onCreateManual={() => setScreen('manual')} />;
    case 'roadmap':
      return <RoadmapScreen mode={mode} onSelect={selectMain} onBack={() => setScreen('home')} onStart={() => setScreen('step')} />;
    case 'step':
      return <StepScreen onClose={() => setScreen('roadmap')} onComplete={() => setScreen('complete')} />;
    case 'complete':
      return <CompleteScreen onContinue={() => setScreen('roadmap')} />;
    case 'ai-prompt':
      return <AiPromptScreen onBack={() => setScreen('explore')} onGenerate={() => setScreen('ai-generating')} />;
    case 'ai-generating':
      return <AiGeneratingScreen onCancel={() => setScreen('ai-prompt')} onFinished={() => setScreen('ai-review')} />;
    case 'ai-review':
      return <AiReviewScreen onBack={() => setScreen('ai-prompt')} onStart={() => setScreen('roadmap')} />;
    case 'manual':
      return <ManualScreen onBack={() => setScreen('explore')} onCreate={() => setScreen('home')} />;
    case 'explore':
      return <ExploreScreen mode={mode} onSelect={selectMain} onCourse={() => setScreen('course')} onCreateAi={() => setScreen('ai-prompt')} onCreateManual={() => setScreen('manual')} />;
    case 'course':
      return <CourseScreen mode={mode} onBack={() => setScreen('explore')} onAdd={() => setScreen('home')} />;
    case 'league':
      return <LeagueScreen mode={mode} onSelect={selectMain} />;
    case 'streak':
      return <StreakScreen onBack={() => setScreen('home')} />;
    case 'profile':
      return <ProfileScreen mode={mode} onSelect={selectMain} onAchievements={() => setScreen('achievements')} onSettings={() => setScreen('settings')} />;
    case 'achievements':
      return <AchievementsScreen mode={mode} onBack={() => setScreen('profile')} />;
    case 'settings':
      return <SettingsScreen mode={mode} setMode={setMode} onBack={() => setScreen('profile')} />;
  }
}

function OnboardingHeader({ progress, onBack, p }: { progress: number; onBack: () => void; p: Palette }) {
  return (
    <View style={styles.onboardingHeader}>
      <BackButton p={p} onPress={onBack} />
      <View style={{ flex: 1 }}>
        <ProgressBar value={progress} p={p} color={p.accent} height={6} />
      </View>
    </View>
  );
}

function WelcomeScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const p = palette.dark;
  return (
    <ScreenFrame mode="dark">
      <View style={styles.welcomeBody}>
        <View style={styles.questMarkWrap}>
          <View style={[styles.questHalo, { borderColor: p.borderStrong }]} />
          <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.questMark}>
            <GText weight={800} style={[styles.star, { color: p.bg }]}>★</GText>
          </LinearGradient>
          <View style={[styles.heroBadge, styles.heroBadgeTop, { backgroundColor: p.raised, borderColor: p.borderStrong }]}>
            <GText style={{ fontSize: 19 }}>🔥</GText>
          </View>
          <View style={[styles.heroBadge, styles.heroBadgeBottom, { backgroundColor: p.raised, borderColor: p.borderStrong }]}>
            <GText weight={800} style={{ color: p.success, fontSize: 20 }}>♜</GText>
          </View>
        </View>
        <View style={styles.centeredCopy}>
          <GText weight={800} style={[styles.display, { color: p.ink }]}>Turn anything{`\n`}into a quest</GText>
          <GText weight={500} style={[styles.heroDescription, { color: p.muted }]}>Habits, skills, side projects. Describe a goal and get a roadmap you actually want to finish.</GText>
        </View>
      </View>
      <View style={styles.welcomeFooter}>
        <View style={styles.dots}>
          <View style={[styles.longDot, { backgroundColor: p.accent }]} />
          <View style={[styles.dot, { backgroundColor: p.borderStrong }]} />
          <View style={[styles.dot, { backgroundColor: p.borderStrong }]} />
        </View>
        <PrimaryButton label="Get started" onPress={onStart} p={p} />
        <Pressable onPress={onSignIn} style={styles.textButton}>
          <GText weight={600} style={{ color: p.muted, fontSize: 13.5 }}>I already have an account</GText>
        </Pressable>
      </View>
    </ScreenFrame>
  );
}

function InterestsScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const p = palette.dark;
  const labels = ['Fitness', 'Languages', 'Music', 'Coding', 'Reading', 'Mindfulness', 'Finance', 'Cooking', 'Career', 'Art'];
  const [selected, setSelected] = useState(() => new Set(['Fitness', 'Music', 'Mindfulness']));
  const toggle = (label: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <ScreenFrame mode="dark">
      <OnboardingHeader progress={66} onBack={onBack} p={p} />
      <ScrollBody contentStyle={styles.onboardingContent} bottomInset={126}>
        <View style={styles.headingBlock}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>What do you want{`\n`}to level up?</GText>
          <GText style={[styles.screenSubtitle, { color: p.muted }]}>Pick a few. We&apos;ll tune your marketplace feed.</GText>
        </View>
        <View style={styles.pillWrap}>
          {labels.map((label) => <Pill key={label} label={label} p={p} selected={selected.has(label)} onPress={() => toggle(label)} />)}
        </View>
        <Card p={p} style={styles.unsureCard}>
          <IconTile glyph="★" color={p.accent} backgroundColor={`${p.accent}22`} />
          <View style={{ flex: 1 }}>
            <GText weight={700} style={{ color: p.ink, fontSize: 14 }}>Not sure yet?</GText>
            <GText style={{ color: p.muted, fontSize: 12, marginTop: 2 }}>Describe a goal and AI builds the path.</GText>
          </View>
        </Card>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}>
        <PrimaryButton label={`Continue · ${selected.size} picked`} onPress={onContinue} p={p} />
      </View>
    </ScreenFrame>
  );
}

function CommitmentScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const p = palette.dark;
  const [pace, setPace] = useState('Regular');
  const [reminder, setReminder] = useState(true);
  const [time, setTime] = useState('8:00 PM');
  const paces = [
    ['5', 'Casual', '1 step a day · 10 XP goal'],
    ['15', 'Regular', '2 steps a day · 30 XP goal'],
    ['30', 'Intense', '4 steps a day · 60 XP goal'],
  ];
  return (
    <ScreenFrame mode="dark">
      <OnboardingHeader progress={100} onBack={onBack} p={p} />
      <ScrollBody contentStyle={styles.onboardingContent} bottomInset={126}>
        <View style={styles.headingBlock}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>Set your daily pace</GText>
          <GText style={[styles.screenSubtitle, { color: p.muted }]}>This becomes your streak goal. Change it any time.</GText>
        </View>
        <View style={{ gap: 8 }}>
          {paces.map(([minutes, name, description]) => {
            const picked = pace === name;
            return (
              <Card key={name} p={p} raised={picked} onPress={() => setPace(name)} style={[styles.paceCard, picked ? { borderColor: p.primary, borderWidth: 1.5 } : null]}>
                {picked ? (
                  <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.minuteTile}>
                    <GText weight={800} style={{ color: p.bg, fontSize: 17 }}>{minutes}<GText weight={700} style={{ color: p.bg, fontSize: 10 }}>m</GText></GText>
                  </LinearGradient>
                ) : (
                  <View style={[styles.minuteTile, { backgroundColor: p.sunken }]}>
                    <GText weight={800} style={{ color: p.muted, fontSize: 17 }}>{minutes}<GText weight={700} style={{ color: p.muted, fontSize: 10 }}>m</GText></GText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <GText weight={700} style={{ color: p.ink, fontSize: 15 }}>{name}</GText>
                  <GText style={{ color: picked ? p.primaryText : p.muted, fontSize: 12, marginTop: 2 }}>{description}</GText>
                </View>
                <View style={[styles.radio, picked ? { backgroundColor: p.primary, borderColor: p.primary } : { borderColor: p.borderStrong }]}>
                  {picked ? <GText weight={800} style={{ color: p.bg, fontSize: 14 }}>✓</GText> : null}
                </View>
              </Card>
            );
          })}
        </View>
        <Card p={p} style={styles.reminderCard}>
          <View style={styles.row}>
            <IconTile glyph="◆" color={p.streak} backgroundColor={`${p.streak}22`} />
            <View style={{ flex: 1 }}>
              <GText weight={700} style={{ color: p.ink, fontSize: 14 }}>Daily reminder</GText>
              <GText style={{ color: p.muted, fontSize: 12 }}>Keeps your streak alive</GText>
            </View>
            <Toggle on={reminder} p={p} onPress={() => setReminder(!reminder)} />
          </View>
          <View style={styles.segmentRow}>
            {['Morning', '8:00 PM', 'Custom'].map((label) => <Pill key={label} label={label} p={p} selected={time === label} showCheck={false} onPress={() => setTime(label)} style={{ flex: 1 }} />)}
          </View>
        </Card>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}>
        <PrimaryButton label="Start my first roadmap" onPress={onContinue} p={p} />
      </View>
    </ScreenFrame>
  );
}

function HomeScreen({ mode, onSelect, onRoadmap, onStreak, onCreateAi, onCreateManual }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onRoadmap: () => void; onStreak: () => void; onCreateAi: () => void; onCreateManual: () => void }) {
  const p = palette[mode];
  const [questDone, setQuestDone] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <MainScaffold mode={mode} active="home" onSelect={onSelect}>
      <View style={styles.homeHeader}>
        <View>
          <GText weight={600} style={{ color: mode === 'dark' ? '#C9A38F' : p.accentDeep, fontSize: 13 }}>☀  Good morning</GText>
          <GText weight={800} style={{ color: p.ink, fontSize: 25, letterSpacing: -0.5, marginTop: 2 }}>Alex</GText>
        </View>
        <View style={styles.row}>
          <Pressable onPress={onStreak} style={[styles.streakPill, { backgroundColor: p.surface, borderColor: p.border }]}>
            <GText style={{ fontSize: 14 }}>🔥</GText><GText weight={700} style={{ color: p.streak, fontSize: 13 }}>21</GText>
          </Pressable>
          <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.avatarSmall}>
            <GText weight={800} style={{ color: p.bg, fontSize: 14 }}>A</GText>
          </LinearGradient>
        </View>
      </View>

      <GradientCard colors={[p.raised, p.surface]} style={[styles.levelCard, { borderColor: p.borderStrong }]}>
        <View style={styles.levelTop}>
          <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.levelTile}>
            <GText weight={800} style={{ color: p.bg, fontSize: 15 }}>12</GText>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <GText weight={700} style={{ color: p.ink, fontSize: 15 }}>Level 12 · Pathfinder</GText>
            <GText style={{ color: p.muted, fontSize: 11.5, marginTop: 2 }}>660 XP to level 13</GText>
          </View>
          <GText weight={700} style={{ color: p.primaryText, fontSize: 13 }}>1,840</GText>
        </View>
        <ProgressBar value={74} p={p} />
        <View style={[styles.statsRow, { borderTopColor: p.borderStrong }]}>
          <MiniStat label="Roadmaps" value="4" color={p.ink} p={p} />
          <View style={[styles.statDivider, { backgroundColor: p.borderStrong }]} />
          <MiniStat label="Streak" value="21" color={p.streak} p={p} />
          <View style={[styles.statDivider, { backgroundColor: p.borderStrong }]} />
          <MiniStat label="League" value="#3" color={p.success} p={p} />
        </View>
      </GradientCard>

      <View style={styles.sectionBlock}>
        <SectionTitle p={p} right={<View style={[styles.timerPill, { backgroundColor: `${p.accent}1F` }]}><GText weight={700} style={{ color: p.accent, fontSize: 11.5 }}>◷ 6h 12m</GText></View>}>Daily quests</SectionTitle>
        <QuestRow p={p} done={questDone} title="Check in to a roadmap" xp="+10 XP" onPress={() => setQuestDone(!questDone)} />
        <QuestRow p={p} title="Complete 2 steps" xp="+30 XP" progress={50} />
        <QuestRow p={p} title="Beat a friend in the league" xp="+50 XP" />
      </View>

      <View style={styles.sectionBlock}>
        <SectionTitle p={p}>Your roadmaps</SectionTitle>
        <View style={styles.roadmapCards}>
          <RoadmapMini p={p} title="Morning Routine" subtitle="Day 21 of 30" value={70} color={p.success} glyph="◷" onPress={onRoadmap} />
          <RoadmapMini p={p} title="Intro to Piano" subtitle="Unit 2 · 12 weeks" value={32} color={p.primary} glyph="▥" onPress={onRoadmap} />
        </View>
        <AddRoadmapTile p={p} onPress={() => setCreateOpen(true)} />
      </View>
      <CreateSheet mode={mode} visible={createOpen} onClose={() => setCreateOpen(false)} onAi={onCreateAi} onManual={onCreateManual} />
    </MainScaffold>
  );
}

function MiniStat({ value, label, color, p }: { value: string; label: string; color: string; p: Palette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <GText weight={700} style={{ color, fontSize: 16 }}>{value}</GText>
      <Overline p={p} style={{ fontSize: 9.5, marginTop: 2 }}>{label}</Overline>
    </View>
  );
}

function QuestRow({ p, title, xp, done = false, progress, onPress }: { p: Palette; title: string; xp: string; done?: boolean; progress?: number; onPress?: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={styles.questRow}>
      <View style={[styles.checkbox, done ? { backgroundColor: p.success, borderColor: p.success } : { backgroundColor: p.sunken, borderColor: p.borderStrong }]}>
        {done ? <GText weight={800} style={{ color: palette.dark.bg, fontSize: 15 }}>✓</GText> : null}
      </View>
      <View style={{ flex: 1 }}>
        <GText weight={600} style={{ color: done ? p.dim : p.ink, fontSize: 13.5, textDecorationLine: done ? 'line-through' : 'none' }}>{title}</GText>
        {progress !== undefined ? <View style={{ marginTop: 7 }}><ProgressBar value={progress} p={p} height={6} /></View> : null}
      </View>
      <GText weight={700} style={{ color: done ? p.dim : p.primaryText, fontSize: 11.5 }}>{xp}</GText>
    </Card>
  );
}

function RoadmapMini({ p, title, subtitle, value, color, glyph, onPress }: { p: Palette; title: string; subtitle: string; value: number; color: string; glyph: string; onPress: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={styles.roadmapMini}>
      <IconTile glyph={glyph} color={color} backgroundColor={`${color}20`} size={33} rounded={11} textSize={16} />
      <GText weight={700} style={{ color: p.ink, fontSize: 13.2, marginTop: 10 }}>{title}</GText>
      <GText style={{ color: p.muted, fontSize: 11.2, marginTop: 3, marginBottom: 9 }}>{subtitle}</GText>
      <ProgressBar value={value} p={p} color={color} height={6} />
    </Card>
  );
}

function AddRoadmapTile({ p, onPress }: { p: Palette; onPress: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={[styles.addRoadmapTile, { borderColor: p.borderStrong }]}>
      <GText weight={800} style={{ color: p.primaryText, fontSize: 20, lineHeight: 22 }}>＋</GText>
      <GText weight={700} style={{ color: p.primaryText, fontSize: 13.5 }}>Add roadmap</GText>
    </Card>
  );
}

function RoadmapScreen({ mode, onSelect, onBack, onStart }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onBack: () => void; onStart: () => void }) {
  const p = palette[mode];
  return (
    <MainScaffold mode={mode} active="continue" onSelect={onSelect} noScroll>
      <View style={styles.compactHeader}>
        <BackButton p={p} onPress={onBack} />
        <View style={{ flex: 1 }}>
          <GText weight={800} style={{ color: p.ink, fontSize: 17 }}>Intro to Piano</GText>
          <GText style={{ color: p.muted, fontSize: 11.5 }}>Unit 2 of 6 · Chords & Rhythm</GText>
        </View>
        <View style={[styles.streakPill, { backgroundColor: p.surface, borderColor: p.border }]}>
          <GText style={{ fontSize: 13 }}>🔥</GText><GText weight={700} style={{ color: p.streak, fontSize: 12 }}>21</GText>
        </View>
      </View>
      <View style={styles.roadmapProgress}>
        <View style={{ flex: 1 }}><ProgressBar value={32} p={p} height={6} /></View>
        <GText weight={700} style={{ color: p.primaryText, fontSize: 11 }}>8 / 25</GText>
      </View>
      <ScrollBody bottomInset={105}>
        <View style={styles.pathCanvas}>
          <View style={styles.pathMap}>
            <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} style={StyleSheet.absoluteFill}>
              <Path d={`${WALKED_PATH} C 195 450 195 530 195 614 C 320 634 326 694 195 714`} stroke={p.border} strokeWidth={16} strokeLinecap="round" fill="none" />
              <Path d={WALKED_PATH} stroke={`${p.primary}66`} strokeWidth={16} strokeLinecap="round" fill="none" />
              <Path d="M111 192 C 88 176 70 168 56 166" stroke={p.success} strokeWidth={3.5} strokeDasharray="2 8" strokeLinecap="round" fill="none" />
              <Path d="M283 304 C 312 292 330 276 338 258" stroke={p.subtle} strokeWidth={3.5} strokeDasharray="2 8" strokeLinecap="round" fill="none" />
              <Path d="M195 614 C 158 638 122 650 96 654" stroke={p.subtle} strokeWidth={3.5} strokeDasharray="2 8" strokeLinecap="round" fill="none" />
            </Svg>

            <PathNode p={p} x={195} y={24} />
            <PathNode p={p} x={276} y={80} />
            <PathNode p={p} x={195} y={136} />
            <PathNode p={p} x={111} y={192} />
            <Landmark p={p} x={56} y={166} size={46} color={p.success} label="Review"><RefreshIcon color={p.success} /></Landmark>
            <ChestNode p={p} x={195} y={248} />
            <PathNode p={p} x={283} y={304} />
            <Landmark p={p} x={338} y={258} size={44} color={p.subtle} labelColor={p.dim} label="Bonus" dashed><StarIcon color={p.dim} /></Landmark>

            <GradientCard colors={[p.raised, p.surface]} style={[styles.nextStepCard, { borderColor: p.primaryDeep }]}>
              <View style={styles.nextStepTop}>
                <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.playButton}>
                  <GText weight={800} style={{ color: p.bg, fontSize: 19 }}>▶</GText>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <GText weight={700} style={[styles.upNext, { color: p.primaryText, backgroundColor: `${p.primary}25` }]}>STEP 8 · UP NEXT</GText>
                  <GText weight={800} style={{ color: p.ink, fontSize: 16, marginTop: 6 }}>Major chords</GText>
                  <GText style={{ color: p.muted, fontSize: 11.5, lineHeight: 17, marginTop: 2 }}>Build C, G and F major and switch between them cleanly.</GText>
                </View>
              </View>
              <View style={[styles.stepMeta, { borderColor: p.borderStrong }]}>
                <GText weight={600} style={{ color: p.muted, fontSize: 11 }}>◷ 15 min</GText>
                <GText weight={600} style={{ color: p.muted, fontSize: 11 }}>▣ 3 exercises</GText>
                <GText weight={700} style={{ color: p.streak, fontSize: 11 }}>★ +40 XP</GText>
              </View>
              <PrimaryButton label="Start step" onPress={onStart} p={p} compact />
            </GradientCard>

            <PathNode p={p} x={195} y={614} locked />
            <Landmark p={p} x={74} y={656} size={44} color={p.border} labelColor={p.dim} label="Review" dashed><RefreshIcon color={p.subtle} /></Landmark>
            <ChestNode p={p} x={291} y={664} locked />
            <Landmark p={p} x={195} y={714} size={62} color={p.success} label="Unit checkpoint"><TrophyIcon color={p.success} /></Landmark>
          </View>
        </View>
      </ScrollBody>
    </MainScaffold>
  );
}

// Roadmap coordinates follow the design canvas (Gamify App.dc.html, "B2 Roadmap"), with everything
// past the next-step card moved 48pt down so the taller native card doesn't cover the locked node.
const MAP_WIDTH = 390;
const MAP_HEIGHT = 776;
// The design scrolls the map up so the first completed node sits above the visible area.
const MAP_TOP_CLIP = 112;
const WALKED_PATH = 'M195 24 C 300 44 305 116 195 136 C 85 156 80 228 195 248 C 310 268 315 340 195 360';

function centeredAt(x: number, y: number, width: number, height = width) {
  return { left: x - width / 2, top: y - height / 2, width, height };
}

function PathNode({ p, x, y, locked }: { p: Palette; x: number; y: number; locked?: boolean }) {
  return (
    <View
      style={[
        styles.pathNode,
        centeredAt(x, y, 52),
        locked
          ? { backgroundColor: p.surface, borderColor: p.bg, outlineColor: p.border, outlineWidth: 2 }
          : { backgroundColor: p.primary, borderColor: p.bg, boxShadow: `0 4px 0 ${p.primaryDeep}` },
      ]}
    >
      {locked ? <LockIcon color={p.border} /> : <CheckIcon color={p.bg} />}
    </View>
  );
}

function ChestNode({ p, x, y, locked }: { p: Palette; x: number; y: number; locked?: boolean }) {
  const box = centeredAt(x, y, locked ? 56 : 58, locked ? 52 : 54);
  if (locked) {
    return (
      <View style={[styles.chestNode, box, { backgroundColor: p.surface, borderColor: p.bg, outlineColor: p.border, outlineWidth: 2 }]}>
        <ChestIcon body={p.border} lid={p.borderStrong} band={p.raised} lock={p.subtle} />
      </View>
    );
  }
  return (
    <LinearGradient colors={['#F0C67E', '#D39B4A']} style={[styles.chestNode, box, { borderColor: p.bg, boxShadow: '0 4px 0 #A6702D' }]}>
      <ChestIcon body="#94642A" lid="#B07E33" band="#754E1F" lock="#F6E3B4" />
    </LinearGradient>
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
  children: React.ReactNode;
}) {
  const width = 130;
  const height = size + 6 + 12;
  return (
    <View style={[styles.landmark, { left: x - width / 2, top: y - height / 2, width }]}>
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
    </View>
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

function RefreshIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 20 20" fill="none">
      <Path d="M17 4.5A8 8 0 1 0 18.5 10" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M18.6 1.4V5.4H14.6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Path d="M10 2L12.3 7.2L18 7.8L13.7 11.6L15 17.4L10 14.3L5 17.4L6.3 11.6L2 7.8L7.7 7.2Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
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

function ChestIcon({ body, lid, band, lock }: { body: string; lid: string; band: string; lock: string }) {
  return (
    <Svg width={32} height={28} viewBox="0 0 34 30" fill="none">
      <Rect x={2} y={10} width={30} height={17} rx={3} fill={body} />
      <Path d="M2 13A11 11 0 0 1 32 13Z" fill={lid} />
      <Rect x={1} y={12.5} width={32} height={4.5} fill={band} />
      <Rect x={14} y={11} width={6} height={10} rx={1.6} fill={lock} />
    </Svg>
  );
}

function StepScreen({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const p = palette.dark;
  const [selected, setSelected] = useState(2);
  const options = ['C · E · G', 'C · F · A', 'D · F♯ · A'];
  return (
    <ScreenFrame mode="dark">
      <View style={styles.sessionHeader}>
        <Pressable onPress={onClose}><GText weight={700} style={{ color: p.dim, fontSize: 24 }}>×</GText></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={66} p={p} height={10} /></View>
        <GText weight={700} style={{ color: p.streak, fontSize: 13 }}>★ 26</GText>
      </View>
      <ScrollBody contentStyle={styles.sessionBody} bottomInset={112}>
        <View>
          <Overline p={p} style={{ color: p.primaryText, marginBottom: 8 }}>Exercise 2 of 3</Overline>
          <GText weight={800} style={{ color: p.ink, fontSize: 23, lineHeight: 30, letterSpacing: -0.4 }}>Which notes make a C major chord?</GText>
        </View>
        <KeyboardIllustration p={p} />
        <View style={{ gap: 8 }}>
          {options.map((option, index) => {
            const number = index + 1;
            const picked = selected === number;
            return (
              <Card key={option} p={p} onPress={() => setSelected(number)} style={[styles.answerCard, picked ? { borderColor: p.primary, borderWidth: 1.5, backgroundColor: `${p.primary}24` } : null]}>
                <View style={[styles.answerNumber, { backgroundColor: picked ? p.primary : p.sunken, borderColor: picked ? p.primary : p.borderStrong }]}>
                  <GText weight={700} style={{ color: picked ? p.bg : p.dim, fontSize: 12 }}>{number}</GText>
                </View>
                <GText weight={picked ? 700 : 600} style={{ color: picked ? p.primaryText : p.ink, fontSize: 14.5 }}>{option}</GText>
              </Card>
            );
          })}
        </View>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}>
        <PrimaryButton label="Check answer" onPress={onComplete} p={p} />
      </View>
    </ScreenFrame>
  );
}

function KeyboardIllustration({ p }: { p: Palette }) {
  return (
    <Card p={p} style={styles.keyboardCard}>
      <View style={styles.keyboard}>
        {Array.from({ length: 7 }).map((_, index) => <View key={index} style={[styles.whiteKey, { borderColor: p.border }]} />)}
        {[1, 2, 4, 5, 6].map((position) => <View key={position} style={[styles.blackKey, { left: position * 34 - 11, backgroundColor: p.surface }]} />)}
        {[12, 80, 148].map((position) => <View key={position} style={[styles.keyDot, { left: position, backgroundColor: p.primary }]} />)}
      </View>
    </Card>
  );
}

function CompleteScreen({ onContinue }: { onContinue: () => void }) {
  const p = palette.dark;
  return (
    <ScreenFrame mode="dark">
      <View style={styles.completeBody}>
        <View style={[styles.completeCheck, { backgroundColor: p.success }]}><GText weight={800} style={{ color: p.bg, fontSize: 57 }}>✓</GText></View>
        <View style={styles.centeredCopy}>
          <GText weight={800} style={{ color: p.ink, fontSize: 25 }}>Step complete</GText>
          <GText style={{ color: p.muted, fontSize: 13.5, marginTop: 8 }}>Major chords down. Minor chords just unlocked.</GText>
        </View>
        <View style={styles.completeStats}>
          <CompleteStat p={p} value="+40" label="XP earned" color={p.streak} />
          <CompleteStat p={p} value="3/3" label="Correct" color={p.success} />
          <CompleteStat p={p} value="12:40" label="Time" color={p.primaryText} />
        </View>
        <Card p={p} style={styles.completeLevel}>
          <View style={styles.spaceBetween}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Level 12 · Pathfinder</GText><GText weight={700} style={{ color: p.primaryText, fontSize: 11.5 }}>1,880 / 2,500</GText></View>
          <View style={{ marginVertical: 10 }}><ProgressBar value={74} p={p} /></View>
          <View style={[styles.streakSecured, { borderTopColor: p.borderStrong }]}><GText style={{ fontSize: 14 }}>🔥</GText><GText weight={600} style={{ color: p.muted, fontSize: 12 }}>Day <GText weight={800} style={{ color: p.streak }}>22</GText> streak secured</GText></View>
        </Card>
      </View>
      <View style={[styles.fixedFooter, { backgroundColor: p.bg }]}><PrimaryButton label="Continue to step 9" onPress={onContinue} p={p} /></View>
    </ScreenFrame>
  );
}

function CompleteStat({ p, value, label, color }: { p: Palette; value: string; label: string; color: string }) {
  return (
    <Card p={p} style={styles.completeStat}>
      <GText weight={800} style={{ color, fontSize: 21 }}>{value}</GText>
      <Overline p={p} style={{ fontSize: 9.5, marginTop: 4 }}>{label}</Overline>
    </Card>
  );
}

// Bottom sheet over Explore for picking a creation flow. Tapping the dimmed backdrop (or Android back) slides it away.
function CreateSheet({ mode, visible, onClose, onAi, onManual }: { mode: ThemeMode; visible: boolean; onClose: () => void; onAi: () => void; onManual: () => void }) {
  const p = palette[mode];
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  const close = () => {
    Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.sheetRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12, 8, 16, 0.62)', opacity: progress }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <Animated.View
          style={[
            styles.createSheet,
            {
              backgroundColor: p.raised,
              borderTopColor: p.borderStrong,
              paddingBottom: 22 + insets.bottom,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [640, 0] }) }],
            },
          ]}>
          <View style={[styles.sheetHandle, { backgroundColor: p.subtle }]} />
          <GText weight={800} style={{ color: p.ink, fontSize: 21, marginBottom: 14 }}>Start something new</GText>
          <GradientCard colors={[p.raised, p.surface]} style={[styles.aiCreateCard, { borderColor: p.accent }]}>
            <Pressable onPress={onAi} style={styles.aiCreateInner}>
              <LinearGradient colors={[p.accent, p.accentDeep]} style={styles.aiCreateIcon}>
                <GText weight={800} style={{ color: palette.dark.bg, fontSize: 24 }}>★</GText>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={[styles.row, { gap: 7 }]}>
                  <GText weight={800} style={{ color: p.ink, fontSize: 15 }}>Build with AI</GText>
                  <View style={[styles.fastestBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 8.5 }}>FASTEST</GText></View>
                </View>
                <GText style={{ color: p.muted, fontSize: 11.5, lineHeight: 17, marginTop: 3 }}>Describe a goal in a sentence. Get units, steps and XP.</GText>
              </View>
            </Pressable>
            <View style={styles.suggestionRow}>
              {['Run a 10k', 'Learn Rust', 'Sleep earlier'].map((label) => <View key={label} style={[styles.suggestion, { backgroundColor: `${p.accent}18` }]}><GText weight={600} style={{ color: mode === 'dark' ? '#E5B8A6' : p.accentShadow, fontSize: 10.5 }}>{label}</GText></View>)}
            </View>
          </GradientCard>
          <View style={styles.createOptions}>
            <CreateOption p={p} glyph="＋" color={p.primary} title="Build manually" subtitle="Add your own steps and rules." onPress={onManual} />
            <CreateOption p={p} glyph="◉" color={p.success} title="From marketplace" subtitle="Fork a ranked roadmap." onPress={close} />
          </View>
          <Card p={p} style={styles.quickHabit}>
            <IconTile glyph="▣" color={p.streak} backgroundColor={`${p.streak}20`} size={34} rounded={11} textSize={15} />
            <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>Quick habit</GText><GText style={{ color: p.muted, fontSize: 11 }}>One thing, every day. 20 seconds to set up.</GText></View>
            <GText weight={700} style={{ color: p.dim, fontSize: 24 }}>›</GText>
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CreateOption({ p, glyph, color, title, subtitle, onPress }: { p: Palette; glyph: string; color: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={styles.createOption}>
      <IconTile glyph={glyph} color={color} backgroundColor={`${color}20`} size={38} rounded={12} textSize={20} />
      <GText weight={700} style={{ color: p.ink, fontSize: 13.5, marginTop: 12 }}>{title}</GText>
      <GText style={{ color: p.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{subtitle}</GText>
    </Card>
  );
}

function AiPromptScreen({ onBack, onGenerate }: { onBack: () => void; onGenerate: () => void }) {
  const p = palette.dark;
  const [level, setLevel] = useState('Beginner');
  const [goal, setGoal] = useState('Get comfortable playing piano by ear so I can jam with friends');
  return (
    <ScreenFrame mode="dark" bottomColor={p.chrome}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5 }}>Build with AI</GText></View>
        <ScrollBody contentStyle={styles.formBody} bottomInset={110}>
          <GText weight={800} style={[styles.screenTitle, { color: p.ink }]}>What do you want{`\n`}to get good at?</GText>
          <TextInput
            multiline
            value={goal}
            onChangeText={setGoal}
            placeholderTextColor={p.dim}
            style={[styles.goalInput, { color: p.ink, borderColor: p.accent, backgroundColor: p.surface, fontFamily: 'JakartaMedium' }]}
          />
          <Overline p={p}>Shape it</Overline>
          <View style={styles.formGrid}>
            <SmallField p={p} label="Timeframe" value="12 weeks" />
            <SmallField p={p} label="Per day" value="15 min" />
          </View>
          <Card p={p} style={styles.levelPicker}>
            <Overline p={p} style={{ flex: 1 }}>Starting level</Overline>
            {['Beginner', 'Some', 'Solid'].map((name) => (
              <Pressable key={name} onPress={() => setLevel(name)} style={[styles.levelChoice, level === name ? { backgroundColor: p.primary } : null]}>
                <GText weight={level === name ? 700 : 600} style={{ color: level === name ? p.bg : p.muted, fontSize: 10.5 }}>{name}</GText>
              </Pressable>
            ))}
          </Card>
          <Overline p={p}>Add context (optional)</Overline>
          <View style={styles.formGrid}>
            <DashedAction p={p} glyph="▱" label="Attach notes" />
            <DashedAction p={p} glyph="↗" label="Paste a link" />
          </View>
        </ScrollBody>
        <View style={[styles.fixedFooter, { backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}><PrimaryButton label="Generate roadmap" onPress={onGenerate} p={p} /></View>
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

function SmallField({ p, label, value }: { p: Palette; label: string; value: string }) {
  return (
    <Card p={p} style={styles.smallField}>
      <Overline p={p} style={{ fontSize: 9.5 }}>{label}</Overline>
      <GText weight={700} style={{ color: p.ink, fontSize: 13.5, marginTop: 4 }}>{value}</GText>
    </Card>
  );
}

function DashedAction({ p, glyph, label }: { p: Palette; glyph: string; label: string }) {
  return (
    <View style={[styles.dashedAction, { backgroundColor: p.sunken, borderColor: p.borderStrong }]}>
      <GText weight={700} style={{ color: p.muted, fontSize: 18 }}>{glyph}</GText>
      <GText weight={600} style={{ color: p.muted, fontSize: 11.5 }}>{label}</GText>
    </View>
  );
}

function AiGeneratingScreen({ onCancel, onFinished }: { onCancel: () => void; onFinished: () => void }) {
  const p = palette.dark;
  useEffect(() => {
    const timeout = setTimeout(onFinished, 2800);
    return () => clearTimeout(timeout);
  }, [onFinished]);
  return (
    <ScreenFrame mode="dark">
      <View style={styles.generatingBody}>
        <View style={styles.generatingMarkWrap}>
          <View style={[styles.spinnerRing, { borderColor: p.borderStrong, borderTopColor: p.accent }]} />
          <LinearGradient colors={[p.accent, p.accentDeep]} style={styles.generatingMark}><GText weight={800} style={{ color: p.bg, fontSize: 34 }}>★</GText></LinearGradient>
        </View>
        <View style={styles.centeredCopy}><GText weight={800} style={{ color: p.ink, fontSize: 23 }}>Drafting your path</GText><GText style={{ color: p.muted, fontSize: 13.5, marginTop: 8 }}>Usually about 15 seconds.</GText></View>
        <View style={{ width: '100%', gap: 8 }}>
          <GenerationRow p={p} label="Understanding your goal" state="done" />
          <GenerationRow p={p} label="Shaping 6 units" state="done" />
          <GenerationRow p={p} label="Writing 25 steps" state="active" />
          <GenerationRow p={p} label="Balancing XP and checkpoints" state="waiting" />
        </View>
      </View>
      <Pressable onPress={onCancel} style={styles.cancelButton}><GText weight={700} style={{ color: p.dim, fontSize: 13.5 }}>Cancel</GText></Pressable>
    </ScreenFrame>
  );
}

function GenerationRow({ p, label, state }: { p: Palette; label: string; state: 'done' | 'active' | 'waiting' }) {
  return (
    <View style={[styles.generationRow, { backgroundColor: p.surface, borderColor: state === 'active' ? p.accent : p.border, opacity: state === 'waiting' ? 0.55 : 1 }]}>
      <View style={[styles.generationState, state === 'done' ? { backgroundColor: p.success, borderColor: p.success } : { borderColor: state === 'active' ? p.accent : p.borderStrong }]}>
        {state === 'done' ? <GText weight={800} style={{ color: p.bg, fontSize: 12 }}>✓</GText> : null}
      </View>
      <GText weight={state === 'active' ? 700 : 600} style={{ color: state === 'done' ? p.dim : p.ink, fontSize: 13.2 }}>{label}</GText>
    </View>
  );
}

function AiReviewScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const p = palette.dark;
  return (
    <ScreenFrame mode="dark">
      <View style={styles.compactHeader}>
        <BackButton p={p} onPress={onBack} />
        <View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 17 }}>Your draft roadmap</GText><GText style={{ color: p.muted, fontSize: 11.5 }}>Edit anything before you commit</GText></View>
        <IconTile glyph="↻" color={p.accent} backgroundColor={`${p.accent}20`} size={36} rounded={12} />
      </View>
      <ScrollBody contentStyle={styles.reviewBody} bottomInset={110}>
        <GradientCard colors={[p.raised, p.surface]} style={[styles.summaryCard, { borderColor: p.borderStrong }]}>
          <GText weight={800} style={{ color: p.ink, fontSize: 18 }}>Play piano by ear</GText>
          <GText style={{ color: p.muted, fontSize: 12, marginTop: 5 }}>12 weeks · 6 units · 25 steps · 15 min a day</GText>
          <View style={styles.tagRow}><TinyTag label="Music" color={p.primaryText} bg={`${p.primary}20`} /><TinyTag label="Beginner" color={p.success} bg={`${p.success}20`} /><TinyTag label="1,100 XP" color={p.streak} bg={`${p.streak}20`} /></View>
        </GradientCard>
        <UnitCard p={p} number="1" title="Getting oriented" subtitle="4 steps · week 1–2" />
        <UnitCard p={p} number="2" title="Chords & rhythm" subtitle="5 steps · week 3–5" open />
        <UnitCard p={p} number="3" title="Playing by ear" subtitle="5 steps · week 6–8" />
      </ScrollBody>
      <View style={[styles.reviewFooter, { backgroundColor: p.chrome, borderTopColor: p.border }]}><IconTile glyph="↻" color={p.accent} backgroundColor={p.surface} size={54} rounded={18} /><View style={{ flex: 1 }}><PrimaryButton label="Start this roadmap" onPress={onStart} p={p} /></View></View>
    </ScreenFrame>
  );
}

function TinyTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <View style={[styles.tinyTag, { backgroundColor: bg }]}><GText weight={700} style={{ color, fontSize: 10.5 }}>{label}</GText></View>;
}

function UnitCard({ p, number, title, subtitle, open = false }: { p: Palette; number: string; title: string; subtitle: string; open?: boolean }) {
  const items = ['Reading chord charts', 'Major chords', 'Minor chords'];
  return (
    <Card p={p} style={[styles.unitCard, open ? { borderColor: p.borderStrong } : null]}>
      <View style={styles.row}>
        <IconTile glyph={number} color={p.primary} backgroundColor={`${p.primary}20`} size={31} rounded={10} textSize={13} />
        <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>{title}</GText><GText style={{ color: p.muted, fontSize: 11 }}>{subtitle}</GText></View>
        <GText weight={700} style={{ color: p.dim, fontSize: 18 }}>{open ? '⌃' : '⌄'}</GText>
      </View>
      {open ? <View style={styles.unitItems}>{items.map((item) => <View key={item} style={[styles.unitItem, { backgroundColor: p.sunken }]}><View style={[styles.bullet, { backgroundColor: p.primary }]} /><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12 }}>{item}</GText><GText style={{ color: p.dim }}>⌕</GText></View>)}<View style={[styles.addStep, { borderColor: p.borderStrong }]}><GText weight={600} style={{ color: p.dim, fontSize: 12 }}>＋ Add step</GText></View></View> : null}
    </Card>
  );
}

function ManualScreen({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  const p = palette.dark;
  const [rhythm, setRhythm] = useState('Daily');
  const [publish, setPublish] = useState(false);
  return (
    <ScreenFrame mode="dark">
      <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5, flex: 1 }}>Build manually</GText><GText weight={700} style={{ color: p.dim, fontSize: 12 }}>Save draft</GText></View>
      <ScrollBody contentStyle={styles.formBody} bottomInset={110}>
        <Card p={p} style={styles.manualTitleCard}><IconTile glyph="◷" color={p.success} backgroundColor={`${p.success}20`} size={46} rounded={16} textSize={22} /><View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 16 }}>Deep work block</GText><GText style={{ color: p.muted, fontSize: 11.5 }}>Tap to rename · change icon</GText></View></Card>
        <Overline p={p}>Rhythm</Overline>
        <View style={styles.segmentRow}>{['Daily', 'Weekdays', 'Custom'].map((label) => <Pill key={label} label={label} p={p} selected={rhythm === label} showCheck={false} onPress={() => setRhythm(label)} style={{ flex: 1 }} />)}</View>
        <View style={styles.spaceBetween}><Overline p={p}>Steps</Overline><GText weight={700} style={{ color: p.accent, fontSize: 11.5 }}>Suggest with AI</GText></View>
        <View style={{ gap: 9 }}>
          <ManualStep p={p} label="Phone in another room" xp="+10" />
          <ManualStep p={p} label="50 min focus timer" xp="+30" />
          <ManualStep p={p} label="Log one takeaway" xp="+10" />
          <View style={[styles.addManualStep, { borderColor: p.borderStrong }]}><GText weight={700} style={{ color: p.dim, fontSize: 12.5 }}>＋ Add step</GText></View>
        </View>
        <Card p={p} style={styles.publishCard}><IconTile glyph="◉" color={p.success} backgroundColor={`${p.success}20`} size={35} rounded={12} textSize={16} /><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Publish to marketplace</GText><GText style={{ color: p.muted, fontSize: 11 }}>Others can fork it and rank it</GText></View><Toggle on={publish} p={p} onPress={() => setPublish(!publish)} /></Card>
      </ScrollBody>
      <View style={[styles.fixedFooter, { backgroundColor: p.chrome, borderTopColor: p.border, borderTopWidth: 1 }]}><PrimaryButton label="Create roadmap" onPress={onCreate} p={p} /></View>
    </ScreenFrame>
  );
}

function ManualStep({ p, label, xp }: { p: Palette; label: string; xp: string }) {
  return <Card p={p} style={styles.manualStep}><GText weight={700} style={{ color: p.subtle, fontSize: 15 }}>☰</GText><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 13 }}>{label}</GText><GText weight={700} style={{ color: p.streak, fontSize: 11 }}>{xp}</GText></Card>;
}

function ExploreScreen({ mode, onSelect, onCourse, onCreateAi, onCreateManual }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onCourse: () => void; onCreateAi: () => void; onCreateManual: () => void }) {
  const p = palette[mode];
  const [filter, setFilter] = useState('For you');
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <MainScaffold mode={mode} active="explore" onSelect={onSelect}>
      <GText weight={800} style={{ color: p.ink, fontSize: 24, letterSpacing: -0.4 }}>Explore</GText>
      <Pressable
        accessibilityRole="button"
        onPress={() => setCreateOpen(true)}
        style={({ pressed }) => [styles.aiCtaShadow, { backgroundColor: p.accentShadow }, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
        <LinearGradient colors={[p.accent, p.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiCta}>
          <View style={[styles.aiCtaIcon, { backgroundColor: `${palette.dark.bg}1A` }]}><SparkleIcon color={palette.dark.bg} /></View>
          <View style={{ flex: 1 }}>
            <GText weight={800} style={{ color: palette.dark.bg, fontSize: 18, letterSpacing: -0.2 }}>Add with AI</GText>
            <GText weight={600} style={{ color: `${palette.dark.bg}B3`, fontSize: 12, marginTop: 2 }}>Describe a goal, get a full roadmap</GText>
          </View>
          <View style={[styles.aiCtaPlus, { backgroundColor: palette.dark.bg }]}><GText weight={800} style={{ color: p.accent, fontSize: 22, lineHeight: 24 }}>+</GText></View>
        </LinearGradient>
      </Pressable>
      <View style={[styles.searchBox, { backgroundColor: p.surface, borderColor: p.border }]}><GText style={{ color: p.dim, fontSize: 19 }}>⌕</GText><GText style={{ color: p.dim, fontSize: 12.5 }}>Search roadmaps, habits, courses</GText></View>
      <View style={styles.filterRow}>{['For you', 'Trending', 'Official', 'Free'].map((label) => <Pill key={label} label={label} p={p} selected={filter === label} showCheck={false} onPress={() => setFilter(label)} style={{ minHeight: 36, paddingHorizontal: 13 }} />)}</View>
      <Pressable onPress={onCourse} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <LinearGradient colors={[p.primaryDeep, p.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureCard}>
          <View style={styles.featureBubble} />
          <View style={[styles.row, { gap: 8 }]}><View style={[styles.officialBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 9 }}>OG · OFFICIAL</GText></View><GText weight={700} style={{ color: '#E4D9FF', fontSize: 10.5 }}>by the gamify team</GText></View>
          <GText weight={800} style={styles.featureTitle}>The 90-Day Strength Base</GText>
          <GText style={styles.featureDescription}>Progressive lifting plan with deload weeks and form checks.</GText>
          <View style={[styles.row, { gap: 16, marginTop: 11 }]}><GText weight={700} style={{ color: '#FFF3B7', fontSize: 11.5 }}>★ 4.9</GText><GText weight={600} style={{ color: '#E4D9FF', fontSize: 11.5 }}>28.4k learners</GText></View>
        </LinearGradient>
      </Pressable>
      <View style={styles.sectionBlock}>
        <SectionTitle p={p} right={<GText weight={700} style={{ color: p.accentDeep, fontSize: 11.5 }}>See all</GText>}>Top this week</SectionTitle>
        <RankedRoadmap p={p} rank="1" glyph="♡" color={p.success} title="Couch to 10k" subtitle="@marta · 12.1k learners" rating="4.8" onPress={onCourse} />
        <RankedRoadmap p={p} rank="2" glyph="▣" color={p.primary} title="Read 24 books this year" subtitle="@dev.kim · 9.7k learners" rating="4.7" onPress={onCourse} />
        <RankedRoadmap p={p} rank="3" glyph="⌑" color={p.accentDeep} title="Spanish in 15 min a day" subtitle="@lingo.lab · 8.3k learners" rating="4.7" onPress={onCourse} />
      </View>
      <View style={styles.sectionBlock}>
        <SectionTitle p={p}>Quick habits</SectionTitle>
        <View style={styles.roadmapCards}><Card p={p} style={styles.quickHabitCard}><GText weight={700} style={{ color: p.ink, fontSize: 12.5 }}>Cold shower</GText><GText style={{ color: p.muted, fontSize: 10.5, marginTop: 3 }}>30 days · 5.1k</GText></Card><Card p={p} style={styles.quickHabitCard}><GText weight={700} style={{ color: p.ink, fontSize: 12.5 }}>Inbox zero</GText><GText style={{ color: p.muted, fontSize: 10.5, marginTop: 3 }}>14 days · 3.8k</GText></Card></View>
      </View>
      <CreateSheet mode={mode} visible={createOpen} onClose={() => setCreateOpen(false)} onAi={onCreateAi} onManual={onCreateManual} />
    </MainScaffold>
  );
}

function RankedRoadmap({ p, rank, glyph, color, title, subtitle, rating, onPress }: { p: Palette; rank: string; glyph: string; color: string; title: string; subtitle: string; rating: string; onPress: () => void }) {
  return (
    <Card p={p} onPress={onPress} style={styles.rankedCard}>
      <GText weight={800} style={{ color: rank === '1' ? p.streak : p.dim, width: 20, fontSize: 13 }}>{rank}</GText>
      <IconTile glyph={glyph} color={color} backgroundColor={`${color}18`} size={39} rounded={13} textSize={18} />
      <View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>{title}</GText><GText style={{ color: p.muted, fontSize: 10.8 }}>{subtitle}</GText></View>
      <GText weight={700} style={{ color: p.ink, fontSize: 11.5 }}><GText style={{ color: p.streak }}>★</GText> {rating}</GText>
    </Card>
  );
}

function CourseScreen({ mode, onBack, onAdd }: { mode: ThemeMode; onBack: () => void; onAdd: () => void }) {
  const p = palette[mode];
  return (
    <ScreenFrame mode={mode}>
      <ScrollBody contentStyle={{ paddingBottom: 112 }}>
        <LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.courseHero}>
          <View style={styles.spaceBetween}><BackButton p={{ ...p, surface: 'rgba(255,255,255,.14)', border: 'rgba(255,255,255,.12)' } as unknown as Palette} onPress={onBack} /><View style={styles.row}><IconTile glyph="♡" color="#fff" backgroundColor="rgba(255,255,255,.15)" size={38} rounded={12} /><IconTile glyph="⌘" color="#fff" backgroundColor="rgba(255,255,255,.15)" size={38} rounded={12} /></View></View>
          <View style={[styles.row, { gap: 8, marginTop: 18 }]}><View style={[styles.officialBadge, { backgroundColor: p.og }]}><GText weight={800} style={{ color: palette.dark.bg, fontSize: 9 }}>OG · OFFICIAL</GText></View><GText weight={700} style={{ color: '#E4D9FF', fontSize: 10.5 }}>gamify team</GText></View>
          <GText weight={800} style={{ color: '#fff', fontSize: 25, lineHeight: 30, marginTop: 12 }}>The 90-Day{`\n`}Strength Base</GText>
          <View style={styles.courseStats}><CourseStat value="4.9" label="Rating" /><View style={styles.courseStatDivider} /><CourseStat value="28.4k" label="Learners" /><View style={styles.courseStatDivider} /><CourseStat value="3,200" label="Total XP" /></View>
          <View style={styles.featureBubbleLarge} />
        </LinearGradient>
        <View style={styles.courseBody}>
          <GText style={{ color: p.muted, fontSize: 13, lineHeight: 20 }}>Three phases of progressive overload with built-in deload weeks. Form-check steps use your camera roll, no gym required until week 4.</GText>
          <View style={styles.tagRow}><TinyTag label="90 days" color={p.muted} bg={p.surface} /><TinyTag label="4 units" color={p.muted} bg={p.surface} /><TinyTag label="Fitness" color={p.muted} bg={p.surface} /></View>
          <SectionTitle p={p}>What&apos;s inside</SectionTitle>
          <Card p={p} style={styles.courseUnits}>{[['1', 'Movement foundations', '6 steps'], ['2', 'Building the base', '9 steps'], ['3', 'Overload & deload', '11 steps']].map(([n, title, steps], index) => <View key={n} style={[styles.courseUnit, index ? { borderTopColor: p.border, borderTopWidth: 1 } : null]}><IconTile glyph={n} color={p.primaryText} backgroundColor={`${p.primary}20`} size={30} rounded={9} textSize={12} /><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12.5 }}>{title}</GText><GText style={{ color: p.dim, fontSize: 10.5 }}>{steps}</GText></View>)}</Card>
          <Card p={p} style={styles.leaderboardCard}>
            <View style={styles.spaceBetween}><GText weight={800} style={{ color: p.ink, fontSize: 14 }}>Leaderboard</GText><GText weight={700} style={{ color: p.accent, fontSize: 10.5 }}>All time</GText></View>
            {[['1', 'J', 'jonas.r', '3,200'], ['2', 'S', 'sofia.k', '3,120'], ['3', 'M', 'mo.aziz', '2,980']].map(([rank, initial, name, xp], index) => <View key={name} style={styles.leaderboardRow}><GText weight={700} style={{ color: index === 0 ? p.streak : p.dim, width: 18, fontSize: 11 }}>{rank}</GText><View style={[styles.personDot, { backgroundColor: [p.accent, p.primary, p.success][index] }]}><GText weight={800} style={{ color: p.bg, fontSize: 10 }}>{initial}</GText></View><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12 }}>{name}</GText><GText weight={700} style={{ color: p.primaryText, fontSize: 11.5 }}>{xp}</GText></View>)}
          </Card>
        </View>
      </ScrollBody>
      <View style={[styles.courseFooter, { backgroundColor: p.chrome, borderTopColor: p.border }]}><IconTile glyph="♡" color={p.muted} backgroundColor={p.surface} size={55} rounded={18} /><View style={{ flex: 1 }}><PrimaryButton label="Add to my roadmaps" onPress={onAdd} p={p} /></View></View>
    </ScreenFrame>
  );
}

function CourseStat({ value, label }: { value: string; label: string }) {
  return <View><GText weight={800} style={{ color: '#fff', fontSize: 16 }}>{value}</GText><GText weight={600} style={{ color: '#E4D9FF', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</GText></View>;
}

function LeagueScreen({ mode, onSelect }: { mode: ThemeMode; onSelect: (tab: MainTab) => void }) {
  const p = palette[mode];
  const players = [
    ['1', 'N', 'nadia.w', '1,240'], ['2', 'T', 'tomasz', '1,105'], ['3', 'A', 'You', '1,020'], ['4', 'R', 'rina.dev', '970'], ['5', 'K', 'kwame.o', '880'], ['8', 'P', 'priya.s', '720'],
  ];
  return (
    <MainScaffold mode={mode} active="league" onSelect={onSelect}>
      <View style={styles.leagueHero}><View style={styles.leagueArrows}><GText style={{ color: p.dim, fontSize: 27 }}>‹</GText><LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.trophyBadge}><GText weight={800} style={{ color: p.bg, fontSize: 30 }}>♜</GText></LinearGradient><GText style={{ color: p.dim, fontSize: 27 }}>›</GText></View><GText weight={800} style={{ color: p.ink, fontSize: 21, marginTop: 10 }}>Amethyst League</GText><GText style={{ color: p.muted, fontSize: 12.5, marginTop: 7 }}>Top 7 advance · 2 days left</GText></View>
      <View style={[styles.leagueTabs, { backgroundColor: p.sunken }]}><View style={[styles.leagueTabActive, { backgroundColor: p.raised }]}><GText weight={700} style={{ color: p.ink, fontSize: 12 }}>Global</GText></View><View style={styles.leagueTabActive}><GText weight={600} style={{ color: p.dim, fontSize: 12 }}>Friends</GText></View></View>
      <View style={{ gap: 8, marginTop: 14 }}>
        {players.map(([rank, initial, name, xp], index) => <View key={name}>{index === 5 ? <View style={styles.promotionLine}><View style={[styles.promotionDash, { backgroundColor: p.borderStrong }]} /><Overline p={p} style={{ color: p.success }}>Promotion line</Overline><View style={[styles.promotionDash, { backgroundColor: p.borderStrong }]} /></View> : null}<Card p={p} style={[styles.playerRow, name === 'You' ? { borderColor: p.primary, borderWidth: 1.5 } : null, index === 5 ? { opacity: 0.55 } : null]}><GText weight={800} style={{ color: rank === '1' ? p.streak : p.dim, width: 20 }}>{rank}</GText><View style={[styles.playerAvatar, { backgroundColor: [p.accent, p.success, p.primary, p.raised, p.raised, p.raised][index] }]}><GText weight={800} style={{ color: name === 'You' ? p.bg : p.ink, fontSize: 11 }}>{initial}</GText></View><View style={{ flex: 1 }}><GText weight={name === 'You' ? 800 : 700} style={{ color: p.ink, fontSize: 13 }}>{name}</GText>{name === 'You' ? <GText weight={600} style={{ color: p.primaryText, fontSize: 10 }}>85 XP from 2nd</GText> : null}</View><GText weight={700} style={{ color: name === 'You' ? p.primaryText : p.muted, fontSize: 12 }}>{xp}</GText></Card></View>)}
      </View>
    </MainScaffold>
  );
}

function StreakScreen({ onBack }: { onBack: () => void }) {
  const p = palette.dark;
  const [used, setUsed] = useState(false);
  return (
    <ScreenFrame mode="dark" background={p.overlay} bottomColor={p.raised}>
      <View style={styles.streakBackdrop}><View style={styles.spaceBetween}><GText weight={800} style={{ color: p.dim, opacity: 0.5, fontSize: 24 }}>Alex</GText><Pressable onPress={onBack}><GText weight={800} style={{ color: p.dim, fontSize: 24 }}>×</GText></Pressable></View><View style={[styles.skeletonLarge, { backgroundColor: p.sunken }]} /><View style={[styles.skeletonSmall, { backgroundColor: p.sunken }]} /></View>
      <View style={[styles.streakSheet, { backgroundColor: p.raised, borderTopColor: p.borderStrong }]}>
        <View style={[styles.sheetHandle, { backgroundColor: p.subtle }]} />
        <GText style={styles.bigFlame}>🔥</GText>
        <GText weight={800} style={{ color: p.ink, textAlign: 'center', fontSize: 23 }}>21-day streak at risk</GText>
        <GText style={{ color: p.muted, textAlign: 'center', fontSize: 12.5, lineHeight: 19, marginTop: 8 }}>You missed yesterday. Use a freeze to keep it, or repair it with gems.</GText>
        <View style={styles.weekRow}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <View key={`${day}-${index}`} style={[styles.dayBox, { backgroundColor: index < 4 ? `${p.streak}25` : p.sunken, borderColor: index === 4 ? p.dim : 'transparent', borderStyle: index === 4 ? 'dashed' : 'solid' }]}><GText weight={700} style={{ color: index < 4 ? p.streak : p.dim, fontSize: 10 }}>{day}</GText></View>)}</View>
        <Card p={p} style={[styles.streakOption, { borderColor: p.primary }]}><IconTile glyph={'✳\uFE0E'} color={p.primary} backgroundColor={`${p.primary}20`} size={44} rounded={13} /><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>Use a streak freeze</GText><GText style={{ color: p.primaryText, fontSize: 11 }}>{used ? 'Streak protected' : '2 left in your pack'}</GText></View><Pressable onPress={() => setUsed(true)} style={[styles.useButton, { backgroundColor: p.primary }]}><GText weight={800} style={{ color: p.bg, fontSize: 12 }}>{used ? 'Used' : 'Use'}</GText></Pressable></Card>
        <Card p={p} style={styles.streakOption}><IconTile glyph="⬠" color={p.success} backgroundColor={`${p.success}20`} size={44} rounded={13} /><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13.5 }}>Repair with gems</GText><GText style={{ color: p.muted, fontSize: 11 }}>Costs 50 · you have 320</GText></View><View style={[styles.repairButton, { backgroundColor: p.raised, borderColor: p.borderStrong }]}><GText weight={800} style={{ color: p.muted, fontSize: 11 }}>Repair</GText></View></Card>
        <Pressable onPress={onBack} style={styles.textButton}><GText weight={700} style={{ color: p.dim, fontSize: 12.5 }}>Start a new streak instead</GText></Pressable>
      </View>
    </ScreenFrame>
  );
}

function ProfileScreen({ mode, onSelect, onAchievements, onSettings }: { mode: ThemeMode; onSelect: (tab: MainTab) => void; onAchievements: () => void; onSettings: () => void }) {
  const p = palette[mode];
  return (
    <MainScaffold mode={mode} active="profile" onSelect={onSelect}>
      <View style={styles.spaceBetween}><GText weight={800} style={{ color: p.ink, fontSize: 23 }}>Profile</GText><Pressable onPress={onSettings}><IconTile glyph="☼" color={p.muted} backgroundColor={p.surface} size={38} rounded={12} /></Pressable></View>
      <View style={styles.profileIdentity}><View><LinearGradient colors={[p.primary, p.primaryDeep]} style={styles.profileAvatar}><GText weight={800} style={{ color: p.bg, fontSize: 28 }}>A</GText></LinearGradient><View style={[styles.levelBubble, { backgroundColor: p.accent, borderColor: p.bg }]}><GText weight={800} style={{ color: p.bg, fontSize: 9 }}>12</GText></View></View><View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 20 }}>Alex Novak</GText><GText style={{ color: p.muted, fontSize: 11.5, marginTop: 2 }}>@alexn · joined Mar 2026</GText><GText weight={600} style={{ color: p.ink, fontSize: 11.5, marginTop: 6 }}>48 <GText style={{ color: p.muted }}>following</GText>    112 <GText style={{ color: p.muted }}>followers</GText></GText></View></View>
      <View style={styles.profileStats}><ProfileStat p={p} value="21" label="Streak" color={p.streak} /><ProfileStat p={p} value="14.2k" label="Total XP" color={p.primaryText} /><ProfileStat p={p} value="7" label="Finished" color={p.success} /></View>
      <Card p={p} style={styles.activityCard}><View style={styles.spaceBetween}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Last 12 weeks</GText><GText style={{ color: p.dim, fontSize: 10.5 }}>XP per day</GText></View><View style={styles.heatmap}>{Array.from({ length: 28 }).map((_, index) => <View key={index} style={[styles.heatCell, { backgroundColor: index % 5 === 0 ? p.sunken : index % 3 === 0 ? p.primary : `${p.primary}80` }]} />)}</View></Card>
      <View style={styles.sectionBlock}><SectionTitle p={p} right={<Pressable onPress={onAchievements}><GText weight={700} style={{ color: p.accent, fontSize: 11.5 }}>All 24</GText></Pressable>}>Achievements</SectionTitle><View style={styles.achievementGrid}><AchievementMini p={p} glyph="🔥" title="3 Weeks Strong" color={p.streak} onPress={onAchievements} /><AchievementMini p={p} glyph="♜" title="League Podium" color={p.primary} onPress={onAchievements} /><AchievementMini p={p} glyph="▣" title="100 Day Club" color={p.dim} onPress={onAchievements} locked /></View></View>
    </MainScaffold>
  );
}

function ProfileStat({ p, value, label, color }: { p: Palette; value: string; label: string; color: string }) {
  return <Card p={p} style={styles.profileStat}><GText weight={800} style={{ color, fontSize: 19 }}>{value}</GText><Overline p={p} style={{ fontSize: 9, marginTop: 5 }}>{label}</Overline></Card>;
}

function AchievementMini({ p, glyph, title, color, locked = false, onPress }: { p: Palette; glyph: string; title: string; color: string; locked?: boolean; onPress: () => void }) {
  return <Card p={p} onPress={onPress} style={[styles.achievementMini, locked ? { opacity: 0.42, borderStyle: 'dashed' } : null]}><IconTile glyph={glyph} color={color} backgroundColor={`${color}20`} size={47} rounded={16} textSize={20} /><GText weight={700} style={{ color: p.ink, fontSize: 11, textAlign: 'center', marginTop: 10 }}>{title}</GText></Card>;
}

function AchievementsScreen({ mode, onBack }: { mode: ThemeMode; onBack: () => void }) {
  const p = palette[mode];
  return (
    <ScreenFrame mode={mode}>
      <View style={styles.compactHeader}><BackButton p={p} onPress={onBack} /><View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 17 }}>Achievements</GText><GText style={{ color: p.muted, fontSize: 11 }}>11 of 24 unlocked</GText></View></View>
      <ScrollBody contentStyle={styles.achievementsBody}>
        <Card p={p} style={styles.collectorCard}><View style={[styles.collectorRing, { borderColor: p.sunken, borderTopColor: p.accent, borderRightColor: p.accent }]}><GText weight={800} style={{ color: p.accent, fontSize: 13, transform: [{ rotate: '25deg' }] }}>46%</GText></View><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 14 }}>Collector</GText><GText style={{ color: p.muted, fontSize: 11.5, lineHeight: 17, marginTop: 2 }}>Unlock 13 more badges to reach the next tier.</GText></View></Card>
        <AchievementSection p={p} title="Streaks" items={[['🔥', '7 Days', 'Unlocked', p.streak, false], ['🔥', '21 Days', 'Unlocked', p.streak, false], ['▣', '100 Days', '21/100', p.dim, true]]} />
        <AchievementSection p={p} title="Mastery" items={[['✓', 'First Finish', 'Unlocked', p.success, false], ['★', '10k XP', 'Unlocked', p.primary, false], ['▣', 'Diamond League', 'Amethyst now', p.dim, true]]} />
        <View><Overline p={p} style={{ marginBottom: 10 }}>Creator</Overline><Card p={p} style={styles.creatorBadge}><IconTile glyph="＋" color={p.accent} backgroundColor={`${p.accent}20`} size={45} rounded={14} textSize={22} /><View style={{ flex: 1 }}><GText weight={700} style={{ color: p.ink, fontSize: 13 }}>Published Author</GText><GText style={{ color: p.muted, fontSize: 11 }}>Publish a roadmap others fork 100 times</GText></View><GText weight={700} style={{ color: p.dim, fontSize: 11.5 }}>34/100</GText></Card></View>
      </ScrollBody>
    </ScreenFrame>
  );
}

function AchievementSection({ p, title, items }: { p: Palette; title: string; items: (string | boolean)[][] }) {
  return <View><Overline p={p} style={{ marginBottom: 10 }}>{title}</Overline><View style={styles.achievementGrid}>{items.map(([glyph, name, status, color, locked]) => <Card key={String(name)} p={p} style={[styles.achievementTile, locked ? { opacity: 0.42, borderStyle: 'dashed' } : null]}><IconTile glyph={String(glyph)} color={String(color)} backgroundColor={`${String(color)}20`} size={47} rounded={16} textSize={20} /><GText weight={700} style={{ color: p.ink, textAlign: 'center', fontSize: 10.5, marginTop: 9 }}>{String(name)}</GText><GText weight={600} style={{ color: locked ? p.dim : p.success, textAlign: 'center', fontSize: 9.5, marginTop: 6 }}>{String(status)}</GText></Card>)}</View></View>;
}

function SettingsScreen({ mode, setMode, onBack }: { mode: ThemeMode; setMode: (mode: ThemeMode) => void; onBack: () => void }) {
  const p = palette[mode];
  const [streakProtection, setStreakProtection] = useState(true);
  const [leagues, setLeagues] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [alerts, setAlerts] = useState(false);
  return (
    <ScreenFrame mode={mode}>
      <View style={styles.simpleHeader}><BackButton p={p} onPress={onBack} /><GText weight={700} style={{ color: p.ink, fontSize: 15.5 }}>Settings</GText></View>
      <ScrollBody contentStyle={styles.settingsBody}>
        <Overline p={p}>Appearance</Overline>
        <View style={styles.themeChoices}><ThemeChoice label="Light" active={mode === 'light'} p={p} preview="light" onPress={() => setMode('light')} /><ThemeChoice label="Dark" active={mode === 'dark'} p={p} preview="dark" onPress={() => setMode('dark')} /><ThemeChoice label="System" active={false} p={p} preview="system" onPress={() => setMode('dark')} /></View>
        <SettingsGroup p={p} title="Goals & reminders"><SettingsLink p={p} label="Daily XP goal" value="30 XP" /><SettingsLink p={p} label="Reminder time" value="8:00 PM" /><SettingsToggle p={p} label="Streak protection" value={streakProtection} onChange={() => setStreakProtection(!streakProtection)} /></SettingsGroup>
        <SettingsGroup p={p} title="Social"><SettingsToggle p={p} label="Join weekly leagues" value={leagues} onChange={() => setLeagues(!leagues)} /><SettingsToggle p={p} label="Public profile" value={publicProfile} onChange={() => setPublicProfile(!publicProfile)} /><SettingsToggle p={p} label="Friend activity alerts" value={alerts} onChange={() => setAlerts(!alerts)} /></SettingsGroup>
        <Card p={p} style={[styles.plusCard, { borderColor: p.accent }]}><LinearGradient colors={[p.accent, p.accentDeep]} style={styles.plusIcon}><GText weight={800} style={{ color: p.bg, fontSize: 22 }}>★</GText></LinearGradient><View style={{ flex: 1 }}><GText weight={800} style={{ color: p.ink, fontSize: 13.5 }}>gamify Plus</GText><GText style={{ color: p.muted, fontSize: 10.8 }}>Unlimited AI roadmaps, extra freezes</GText></View><GText weight={700} style={{ color: p.accent, fontSize: 25 }}>›</GText></Card>
      </ScrollBody>
    </ScreenFrame>
  );
}

function ThemeChoice({ label, active, p, preview, onPress }: { label: string; active: boolean; p: Palette; preview: ThemeMode | 'system'; onPress: () => void }) {
  const previewBg = preview === 'dark' ? palette.dark.bg : preview === 'light' ? palette.light.surface : '#F7F1F5';
  const previewInk = preview === 'dark' ? palette.dark.primary : preview === 'light' ? palette.light.primary : palette.dark.bg;
  return <Pressable onPress={onPress} style={[styles.themeChoice, { backgroundColor: p.surface, borderColor: active ? p.primary : p.border, borderWidth: active ? 1.5 : 1 }]}><View style={[styles.themePreview, { backgroundColor: previewBg, borderColor: p.border }]}><View style={[styles.previewBar, { backgroundColor: preview === 'system' ? palette.light.surface : p.border }]} /><View style={[styles.previewAccent, { backgroundColor: previewInk }]} /></View><GText weight={active ? 700 : 600} style={{ color: active ? p.primaryText : p.muted, fontSize: 11 }}>{label}</GText></Pressable>;
}

function SettingsGroup({ p, title, children }: { p: Palette; title: string; children: React.ReactNode }) {
  return <View><Overline p={p} style={{ marginBottom: 10 }}>{title}</Overline><Card p={p} style={styles.settingsGroup}>{children}</Card></View>;
}

function SettingsLink({ p, label, value }: { p: Palette; label: string; value: string }) {
  return <View style={[styles.settingRow, { borderBottomColor: p.border }]}><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12.5 }}>{label}</GText><GText weight={700} style={{ color: p.primaryText, fontSize: 11.5 }}>{value}</GText><GText style={{ color: p.dim, fontSize: 22 }}>›</GText></View>;
}

function SettingsToggle({ p, label, value, onChange }: { p: Palette; label: string; value: boolean; onChange: () => void }) {
  return <View style={[styles.settingRow, { borderBottomColor: p.border }]}><GText weight={600} style={{ color: p.ink, flex: 1, fontSize: 12.5 }}>{label}</GText><Toggle on={value} p={p} onPress={onChange} /></View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 34 },
  questMarkWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  questHalo: { position: 'absolute', width: 136, height: 136, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 999 },
  questMark: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#8E6EF0', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.42, shadowRadius: 22 },
  star: { fontSize: 54, lineHeight: 62 },
  heroBadge: { position: 'absolute', width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadgeTop: { top: 8, right: 12 },
  heroBadgeBottom: { bottom: 13, left: 5 },
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
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 36, borderRadius: 999, borderWidth: 1 },
  avatarSmall: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  levelCard: { borderWidth: 1, borderRadius: 25, padding: 17, marginBottom: 12 },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  levelTile: { width: 41, height: 41, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 13, marginTop: 14 },
  statDivider: { width: 1 },
  sectionBlock: { gap: 8, marginBottom: 12 },
  timerPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  questRow: { borderRadius: 17, paddingHorizontal: 14, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 29, height: 29, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  roadmapCards: { flexDirection: 'row', gap: 8 },
  roadmapMini: { flex: 1, padding: 14, borderRadius: 19 },
  addRoadmapTile: { minHeight: 54, borderRadius: 19, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 8 },
  roadmapProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingVertical: 8 },
  pathCanvas: { height: MAP_HEIGHT - MAP_TOP_CLIP, overflow: 'hidden' },
  pathMap: { position: 'absolute', top: -MAP_TOP_CLIP, left: '50%', marginLeft: -MAP_WIDTH / 2, width: MAP_WIDTH, height: MAP_HEIGHT },
  pathNode: { position: 'absolute', borderRadius: 999, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  chestNode: { position: 'absolute', borderRadius: 14, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  landmark: { position: 'absolute', alignItems: 'center', gap: 6 },
  landmarkDiamond: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  landmarkLabel: { fontSize: 9.5, letterSpacing: 0.6 },
  nextStepCard: { position: 'absolute', left: GUTTER, right: GUTTER, top: 334, borderRadius: 24, borderWidth: 1.5, padding: 16, boxShadow: '0 14px 34px rgba(0,0,0,0.45)' },
  nextStepTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playButton: { width: 53, height: 53, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  upNext: { alignSelf: 'flex-start', fontSize: 9, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, letterSpacing: 0.6 },
  stepMeta: { flexDirection: 'row', gap: 14, paddingVertical: 11, marginVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 15 },
  sessionBody: { paddingHorizontal: GUTTER, gap: 14 },
  keyboardCard: { padding: 21, borderRadius: 22, alignItems: 'center' },
  keyboard: { width: 239, height: 94, flexDirection: 'row', position: 'relative' },
  whiteKey: { width: 34, height: 94, borderWidth: 1, borderRadius: 4, backgroundColor: '#F2ECF6' },
  blackKey: { position: 'absolute', top: 0, width: 22, height: 58, borderRadius: 3 },
  keyDot: { position: 'absolute', top: 73, width: 16, height: 16, borderRadius: 999 },
  answerCard: { padding: 15, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  answerNumber: { width: 27, height: 27, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  completeBody: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER, gap: 20 },
  completeCheck: { width: 122, height: 122, borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', shadowColor: '#74C79C', shadowOpacity: 0.32, shadowRadius: 24 },
  completeStats: { flexDirection: 'row', gap: 9 },
  completeStat: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 18 },
  completeLevel: { padding: 16, borderRadius: 20 },
  streakSecured: { flexDirection: 'row', gap: 7, paddingTop: 11, borderTopWidth: 1 },
  streakBackdrop: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 10, gap: 12 },
  skeletonLarge: { height: 145, borderRadius: 25 },
  skeletonSmall: { height: 58, borderRadius: 20 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
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
  formGrid: { flexDirection: 'row', gap: 10 },
  smallField: { flex: 1, padding: 13, borderRadius: 16 },
  levelPicker: { padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelChoice: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  dashedAction: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 15, alignItems: 'center', gap: 7 },
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
  addStep: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 11, padding: 9 },
  reviewFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 13, paddingBottom: Platform.OS === 'web' ? 20 : 10 },
  manualTitleCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 },
  manualStep: { padding: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  addManualStep: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 15, padding: 13, alignItems: 'center' },
  publishCard: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  aiCtaShadow: { borderRadius: 22, paddingBottom: 5, marginTop: 12 },
  aiCta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16 },
  aiCtaIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aiCtaPlus: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 15, height: 48, paddingHorizontal: 14, marginTop: 10 },
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
  courseFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 13, paddingBottom: Platform.OS === 'web' ? 20 : 10 },
  leagueHero: { alignItems: 'center', marginTop: 4, marginBottom: 12 },
  leagueArrows: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  trophyBadge: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  leagueTabs: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  leagueTabActive: { flex: 1, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  playerRow: { paddingHorizontal: 14, minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerAvatar: { width: 35, height: 35, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  promotionLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  promotionDash: { height: 1, flex: 1 },
  streakSheet: { borderTopWidth: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingBottom: 24, paddingTop: 16 },
  bigFlame: { fontSize: 63, textAlign: 'center', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 12 },
  dayBox: { width: 31, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  streakOption: { minHeight: 78, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  useButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  repairButton: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: 15, marginVertical: 14 },
  profileAvatar: { width: 78, height: 78, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  levelBubble: { position: 'absolute', right: -1, bottom: -1, width: 31, height: 24, borderRadius: 999, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  profileStats: { flexDirection: 'row', gap: 9 },
  profileStat: { flex: 1, alignItems: 'center', paddingVertical: 17, borderRadius: 17 },
  activityCard: { padding: 15, marginVertical: 12 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 13 },
  heatCell: { width: 16, height: 16, borderRadius: 4 },
  achievementGrid: { flexDirection: 'row', gap: 9 },
  achievementMini: { flex: 1, minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 10 },
  achievementsBody: { paddingHorizontal: GUTTER, paddingTop: 6, gap: 12 },
  collectorCard: { padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14 },
  collectorRing: { width: 52, height: 52, borderRadius: 999, borderWidth: 6, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-25deg' }] },
  achievementTile: { flex: 1, minHeight: 132, alignItems: 'center', justifyContent: 'center', padding: 8 },
  creatorBadge: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsBody: { paddingHorizontal: GUTTER, paddingTop: 8, gap: 14 },
  themeChoices: { flexDirection: 'row', gap: 9, marginTop: -10 },
  themeChoice: { flex: 1, borderRadius: 17, padding: 10, alignItems: 'center', gap: 9 },
  themePreview: { height: 56, width: '100%', borderRadius: 11, borderWidth: 1, padding: 8, gap: 6 },
  previewBar: { width: '55%', height: 9, borderRadius: 4 },
  previewAccent: { width: '100%', height: 20, borderRadius: 6 },
  settingsGroup: { overflow: 'hidden' },
  settingRow: { minHeight: 53, paddingHorizontal: 15, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  plusCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  plusIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
