// ============================================================================
// DATASETS & CLINICAL SEED CONTENT
// ============================================================================

export const INITIAL_SEED_DATASETS = [
  {
    id: "d1_major",
    system_key: "jones",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "Jones Major Criteria",
    specialty: "Rheumatology",
    criteria: [
      { id: "jc1", full_text: "Active carditis clinically observed or detected by echocardiographic evidence of valvular dysfunction.", short_label: "Active Carditis", category: "Jones Major", explanation: "Affects all layers of the heart (pancarditis)." },
      { id: "jc2", full_text: "Migratory polyarthritis typically involving large joints such as knees, ankles, elbows, and wrists.", short_label: "Polyarthritis", category: "Jones Major", explanation: "Inflammatory joint pain that moves rapidly from one joint to another." },
      { id: "jc3", full_text: "Sydenham chorea consisting of rapid, purposeless, involuntary movements of the face and extremities.", short_label: "Sydenham Chorea", category: "Jones Major", explanation: "A delayed autoimmune reaction targeting the basal ganglia." },
      { id: "jc4", full_text: "Erythema marginatum showing nonpruritic, macular, serpentine-like rashes with active margins.", short_label: "Erythema Marg.", category: "Jones Major", explanation: "A rare, transient, light pink skin rash with ring-like edges." }
    ]
  },
  {
    id: "d1_minor",
    system_key: "jones",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "Jones Minor Criteria",
    specialty: "Rheumatology",
    criteria: [
      { id: "jc5", full_text: "Fever equal to or greater than 38.5 degrees Celsius in low-risk populations.", short_label: "Fever >= 38.5 C", category: "Jones Minor", numerical_value: 38.5, explanation: "Systemic response to underlying streptococcus-induced inflammatory cascade." },
      { id: "jc6", full_text: "Prolonged PR interval detected on electrocardiogram, adjusted for patient's age.", short_label: "Prolonged PR Interval", category: "Jones Minor", explanation: "Reflects first-degree atrioventricular block." }
    ]
  },
  {
    id: "d2_major",
    system_key: "duke",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "Duke Major Criteria",
    specialty: "Cardiology",
    criteria: [
      { id: "dc1", full_text: "Two separate positive blood cultures with typical microorganisms in the absence of a primary focus.", short_label: "Pos. Blood Culture", category: "Duke Major", explanation: "Consistent bacteremia is characteristic of endovascular infections." },
      { id: "dc2", full_text: "Echocardiogram demonstrating an oscillating intracardiac mass, abscess, or new partial dehiscence of a prosthetic valve.", short_label: "Echo Damage", category: "Duke Major", explanation: "Echocardiography remains the imaging gold standard to visualize bacterial vegetations." }
    ]
  },
  {
    id: "d2_minor",
    system_key: "duke",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "Duke Minor Criteria",
    specialty: "Cardiology",
    criteria: [
      { id: "dc3", full_text: "Fever equal to or greater than 38.0 degrees Celsius.", short_label: "Fever >= 38.0 C", category: "Duke Minor", numerical_value: 38.0, explanation: "Infectious process triggering IL-1 and TNF-mediated pyrexia." },
      { id: "dc4", full_text: "Vascular phenomena including major arterial emboli, septic pulmonary infarcts, or Janeway lesions.", short_label: "Vascular Phenomena", category: "Duke Minor", explanation: "Caused by septic emboli breaking off from vegetations." }
    ]
  },
  {
    id: "d3",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "CHA2DS2-VASc Criteria",
    specialty: "Cardiology",
    criteria: [
      { id: "cv1", full_text: "Age equal to or greater than 75 years.", short_label: "Age >= 75 Years", category: "Risk Factor", numerical_value: 75, explanation: "Advanced age is a strong risk factor for ischemic strokes." },
      { id: "cv2", full_text: "Prior stroke, transient ischemic attack (TIA), or thromboembolism history.", short_label: "Prior Stroke/TIA", category: "Risk Factor", explanation: "A prior history of thrombosis indicates high susceptibility to recurrent stroke." }
    ]
  },
  {
    id: "d9",
    subject: "Medicine",
    chapter: "Cardiology",
    diagnosis: "Severe Aortic Stenosis Parameters",
    specialty: "Cardiology",
    criteria: [
      { id: "as1", full_text: "Aortic Jet Velocity equal to or greater than 4.0 meters per second.", short_label: "Jet Velocity >= 4.0", category: "Echo Parameter", numerical_value: 4.0, explanation: "High jet velocity reflects the increased pressure gradient across a narrowed valve." },
      { id: "as2", full_text: "Mean Pressure Gradient equal to or greater than 40 mmHg across the aortic valve.", short_label: "Mean Gradient >= 40", category: "Echo Parameter", numerical_value: 40, explanation: "The pressure difference between the left ventricle and aorta during systole." }
    ]
  }
];

export const INITIAL_CANVAS_CONFIGS = [
  {
    id: "cc_cardiology_1",
    name: "Cardiology Canvas #1",
    chapter: "Cardiology",
    gamingQuestion: "Identify the Criteria",
    maxTiles: 16,
    criteriaIds: [],
    customCriteria: []
  },
  {
    id: "cc_cardiology_2",
    name: "Cardiology Canvas #2",
    chapter: "Cardiology",
    gamingQuestion: "Identify the Criteria",
    maxTiles: 12,
    criteriaIds: [],
    customCriteria: []
  }
];


// ============================================================================
// AUDIO UTILITY
// ============================================================================

export const playSound = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'success') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.08);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.2);
    } else if (type === 'panic') {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (e) {
    console.warn('Audio contextual initialization deferred');
  }
};

// ============================================================================
// DISTRACTOR GENERATOR
// ============================================================================

export const mutateNumericalValue = (item) => {
  if (item.numerical_value === undefined) return null;
  const original = item.numerical_value;
  const step = original % 1 === 0 ? (original > 10 ? 5 : 1) : 0.5;
  const offset = (Math.random() > 0.5 ? 1 : -1) * step;
  const mutatedVal = original + offset;
  const mutatedLabel = item.short_label.replace(String(original), String(mutatedVal));
  return {
    ...item,
    id: `${item.id}_mutated_${mutatedVal}`,
    numerical_value: mutatedVal,
    short_label: mutatedLabel,
    diagnosis_id: "mutated_distractor",
    explanation: `Incorrect numerical distractor. The actual diagnostic cutoff value is ${original}, not ${mutatedVal}.`
  };
};
