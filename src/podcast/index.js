// Central export for podcast assets and all real episodes
import hubermanAudio from './Andrew Huberman_ Become Mentally Dangerous With These Daily Habits _ FO556 Raj Shamani [Y566_T-YlNQ] (1).mp3';
import druskiAudio from "./Druski_ They're Lying To You About Overnight Success_ [UhzI1fg8rCA].mp3";
import tomHollandAudio from './TOM HOLLAND_ How Tom Overcame Social Anxiety- The Mindset That Changed Everything_ [GOqEl4ADyVk].mp3';

import thumbnail1 from './thumbnail1.jpg';
import thumbnail2 from './thumbnail2.jpg';
import thumbnail3 from './thumbnail3.jpg';

import hubermanCaptions from './real_captions.json';
import druskiCaptions from './druski_captions.json';
import tomHollandCaptions from './tom_holland_captions.json';

export const HUBERMAN_EPISODE = {
  id: 'huberman-habits-01',
  title: 'Become Mentally Dangerous With These Daily Habits',
  subtitle: 'Dr. Andrew Huberman × Figuring Out with Raj Shamani',
  host: 'Raj Shamani',
  guest: 'Dr. Andrew Huberman',
  show: 'Figuring Out',
  category: 'Neuroscience & High Performance',
  audioUrl: hubermanAudio,
  coverImage: thumbnail1,
  cover: thumbnail1,
  duration: 4920,
  views: '4.2M plays',
  releaseDate: 'Oct 2024',
  description: 'Neurobiologist and Stanford Professor Dr. Andrew Huberman breaks down daily non-negotiable protocols: optimal morning sunlight, cold exposure, dopamine regulation, nervous system reset, and how to develop razor-sharp focus and mental resilience.',
  tags: ['Neuroscience', 'Focus', 'Daily Habits', 'Dopamine', 'Health Optimization'],
  chapters: [
    { id: 'ch-1', start: 0, end: 21, title: 'Introduction & Mental Friction', summary: 'Using the physical body to alter cognitive state and overcome initial inertia.' },
    { id: 'ch-2', start: 21, end: 40, title: 'Morning Photons & Circadian Reset', summary: 'Viewing sunlight within 30-60 mins of waking to set cortisol and alertness.' },
    { id: 'ch-3', start: 40, end: 54, title: 'Dopamine Dynamics & Pursuit', summary: 'Attaching dopamine to the effort process rather than only the final outcome.' },
    { id: 'ch-4', start: 54, end: 76, title: 'The Physiological Sigh', summary: 'Two nasal inhales and extended mouth exhale for instantaneous nervous system downregulation.' },
    { id: 'ch-5', start: 76, end: 110, title: 'Non-Negotiable Fundamentals', summary: 'Mastering sleep architecture, morning light, deliberate movement, and focus blocks.' },
    { id: 'ch-6', start: 110, end: 160, title: 'Deliberate Cold & Epinephrine Surges', summary: 'How deliberate cold exposure sustains dopamine and epinephrine elevation for hours.' },
    { id: 'ch-7', start: 160, end: 260, title: 'Neural Transmission & Electrolytes', summary: 'Morning hydration protocols to prevent neurological fatigue and cognitive decline.' },
    { id: 'ch-8', start: 260, end: 600, title: 'Disciplined Lifestyle Architecture', summary: 'Consistency over intensity: calibrating biological systems to achieve mental toughness.' },
  ],
  captions: hubermanCaptions,
};

export const DRUSKI_EPISODE = {
  id: 'druski-overnight-success-02',
  title: "They're Lying To You About Overnight Success",
  subtitle: 'Druski on The Pivot Podcast / Hard Truths of Building an Empire',
  host: 'The Pivot / Ryan Clark, Fred Taylor, Channing Crowder',
  guest: 'Druski (Drew Desbordes)',
  show: 'The Pivot Podcast',
  category: 'Comedy, Mindset & Culture',
  audioUrl: druskiAudio,
  coverImage: thumbnail2,
  cover: thumbnail2,
  duration: 3120,
  views: '2.8M plays',
  releaseDate: 'Sep 2024',
  description: 'Comedian and cultural powerhouse Druski pulls back the curtain on years of rejection, sleepless grinding before viral fame, dealing with fake industry support, and why true longevity requires relentless patience.',
  tags: ['Comedy', 'Entrepreneurship', 'Mindset', 'Culture', 'Creativity'],
  chapters: [
    { id: 'dr-1', start: 0, end: 120, title: 'The Illusion of Instant Fame', summary: 'Druski on 10 years of unrecognized hustle before social media blew up.' },
    { id: 'dr-2', start: 120, end: 340, title: 'Coulda Been Records & Viral Satire', summary: 'How authentic absurdity created one of the biggest comedy movements.' },
    { id: 'dr-3', start: 340, end: 700, title: 'Staying Grounded While Leveling Up', summary: 'Protecting energy, keeping genuine friends, and ignoring industry noise.' },
    { id: 'dr-4', start: 700, end: 1400, title: 'Business Mindset & Next Chapters', summary: 'Transitioning from skits to feature films and stadium tours.' },
  ],
  captions: druskiCaptions,
};

export const TOM_HOLLAND_EPISODE = {
  id: 'tom-holland-anxiety-03',
  title: 'How Tom Overcame Social Anxiety: The Mindset That Changed Everything',
  subtitle: 'Tom Holland on Jay Shetty Podcast / Vulnerability & Sobriety',
  host: 'Jay Shetty',
  guest: 'Tom Holland',
  show: 'On Purpose with Jay Shetty',
  category: 'Mental Health, Growth & Identity',
  audioUrl: tomHollandAudio,
  coverImage: thumbnail3,
  cover: thumbnail3,
  duration: 4860,
  views: '5.1M plays',
  releaseDate: 'Aug 2024',
  description: 'Hollywood star Tom Holland opens up with raw honesty about wrestling with intense social anxiety, navigating overwhelming global fame as Spider-Man, his journey to sobriety, and rebuilding a peaceful inner life.',
  tags: ['Mental Health', 'Sobriety', 'Self-Awareness', 'Hollywood', 'Vulnerability'],
  chapters: [
    { id: 'th-1', start: 0, end: 180, title: 'Unmasking the Super Hero', summary: 'The reality of public panic attacks behind red carpet smiles.' },
    { id: 'th-2', start: 180, end: 450, title: 'The Decision to Get Sober', summary: 'Recognizing addiction patterns and choosing radical mental clarity.' },
    { id: 'th-3', start: 450, end: 900, title: 'Quiet Confidence Over Approval', summary: 'Breaking free from people-pleasing and external validation.' },
    { id: 'th-4', start: 900, end: 1600, title: 'Daily Grounding Rituals', summary: 'Carpentry, family, and simple routines that anchor everyday peace.' },
  ],
  captions: tomHollandCaptions,
};

// All available 3 real podcasts (Zero mockups)
export const PODCAST_CATALOG = [
  HUBERMAN_EPISODE,
  DRUSKI_EPISODE,
  TOM_HOLLAND_EPISODE,
];

export const ALL_REAL_EPISODES = PODCAST_CATALOG;

export {
  hubermanAudio,
  druskiAudio,
  tomHollandAudio,
  thumbnail1,
  thumbnail2,
  thumbnail3,
  hubermanCaptions,
  druskiCaptions,
  tomHollandCaptions,
};
