const CLINICAL_RESPONSES: Record<string, string> = {
  "otitis media": `### Acute Otitis Media (AOM) Clinical Guidelines

Review diagnostic thresholds and drug dosing instructions according to local clinical standards.

#### 1. Diagnostic Indicators
* **Tympanic Membrane (TM)**: Severe bulging, moderate bulging accompanied by new-onset otorrhea, or intense erythema.
* **Symptoms**: Sudden onset ear pain (otalgia), irritability, and fever.

#### 2. Treatment Strategy
* **First-Line Therapy**: Amoxicillin.
* **Pediatric Dosage**: **80-90 mg/kg/day** divided into two doses (maximum 3g/day).
* **Duration**: 10 days for patients under 2 years; 5-7 days for patients 6 years and older with mild-to-moderate symptoms.

#### 3. Observation Option
May observe for 48-72 hours in children 6 months to 2 years with unilateral, non-severe symptoms, provided reliable follow-up is guaranteed.`,

  "tonsil": `### Acute Tonsillitis Consultation Guidelines

Follow the standardized assessment pathway for patients presenting with sore throat.

#### 1. Clinical Scoring (Centor Score)
Administer 1 point for each indicator:
* Tonsillar exudates present
* Tender anterior cervical adenopathy
* History of fever (>38.0°C)
* Absence of cough
* Age parameter (1 point for 3-14 years; 0 points for 15-44 years; -1 point for >=45 years)

#### 2. Management Pathway
* **Score 0-1**: No antibiotic therapy or throat culture required.
* **Score 2-3**: Perform rapid antigen test or throat culture. Treat only if positive.
* **Score 4-5**: Empiric antibiotic therapy (Penicillin V first line) can be considered.

#### 3. Surgical Referral Thresholds
Refer for tonsillectomy if criteria match: 7 episodes in the past year, 5 episodes annually for 2 years, or 3 episodes annually for 3 years.`,

  "vertigo": `### Vestibular Triage Pathway

Use these guidelines to evaluate patients presenting with acute vestibular syndrome (AVS).

#### 1. Peripheral Vestibular Triage (BPPV)
* **Diagnosis**: Dix-Hallpike maneuver triggers transient, crescendo-decrescendo geotropic nystagmus.
* **Treatment**: Epley canalith repositioning maneuver.

#### 2. HINTS Diagnostic Battery
Perform to rule out central stroke in continuous vertigo with nystagmus:
* **Head Impulse Test**: Normal head impulse strongly suggests a central lesion.
* **Nystagmus**: Bidirectional or vertical nystagmus suggests a central lesion.
* **Test of Skew**: Vertical misalignment on alternate cover testing suggests a central lesion.

#### 3. High-Risk Red Flags
Transfer immediately to emergency if any are present:
* Dysarthria, dysphagia, dysphonia, or diplopia (the "4 Ds").
* Acute limb ataxia or profound gait instability (inability to stand unsupported).`
};

const DEFAULT_RESPONSE = `### MOH Clinical Guidelines Index

Your query did not match specific diagnostic pathways. Ensure you consult the core guidelines:

#### Core Chapters
1. **Pediatric Otolaryngology**: Otitis media thresholds and tonsillectomy criteria.
2. **Otology & Neurotology**: Peripheral vertigo assessment and HINTS triage protocols.
3. **Rhinology & Sinusitis**: Guidelines on acute rhinosinusitis and antibiotic stewardship.

Please refine your query with key clinical keywords such as "otitis media", "tonsillitis", or "vertigo".`;

export function getMockResponse(query: string): string {
  const clean = query.toLowerCase();
  if (clean.includes("otitis") || clean.includes("media")) {
    return CLINICAL_RESPONSES["otitis media"];
  }
  if (clean.includes("tonsil") || clean.includes("throat")) {
    return CLINICAL_RESPONSES["tonsil"];
  }
  if (clean.includes("vertigo") || clean.includes("dizzy")) {
    return CLINICAL_RESPONSES["vertigo"];
  }
  return DEFAULT_RESPONSE;
}

export function simulateStreaming(
  content: string,
  onChunk: (text: string, isStreaming: boolean) => void
) {
  const words = content.split(" ");
  let index = 0;
  let currentText = "";

  const timer = setInterval(() => {
    if (index >= words.length) {
      clearInterval(timer);
      onChunk(content, false);
    } else {
      // Append 2-3 words per iteration to simulate LLM streaming
      const count = Math.min(3, words.length - index);
      const chunk = words.slice(index, index + count).join(" ");
      currentText += (currentText ? " " : "") + chunk;
      index += count;
      onChunk(currentText, true);
    }
  }, 100);

  return () => clearInterval(timer);
}
