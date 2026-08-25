import PresidentPhoto from '../assets/Dr-Puja-Sakhuja,-President.jpg';
import VicePresidentPhoto from '../assets/Dr-Rajni-Prasad-Hon-Vice-President.jpeg';
import SecretaryPhoto from '../assets/Dr-Prasenjit-Das,-Secrertary-General.jpg';

const presidentMessage = `President’s Message

Dear Esteemed Members and Colleagues

It is my humble honour to be the President of the Delhi Chapter of the Indian Association of Pathologists and Microbiologists.

As a professional community, the endeavour has always been to promote excellence in our field through high-quality scientific learning programs, academic exchange, and collaboration. This platform brings together experienced Pathologists, established academicians, and the next generation of pathologists and microbiologists.

Our scientific programmes will strive to encompass contemporary advances in diagnostic pathology, laboratory medicine, molecular diagnostics, and emerging technologies such as Artificial Intelligence, while also addressing the practical challenges faced in everyday practice. We hope to achieve this through conferences and workshops that will encourage meaningful discussions, interaction, and opportunities to share research and innovative ideas.

A particular focus of the Delhi Chapter will be to encourage and engage our younger colleagues. Their enthusiasm, curiosity, and new perspectives are vital to the future of our disciplines. We hope to provide them with opportunities to present their work, interact with experienced Pathologists in the field, develop academic and research skills, and become active contributors to our professional community.

I look forward to an exciting journey of learning, collaboration, and shared excellence, and warmly invite all members to participate and make the Delhi Chapter a vibrant scientific forum.

"Alone we can do so little; together we can do so much." — Helen Keller

With warm regards,
Dr Puja Sakhuja
President, Delhi Chapter
Indian Association of Pathologists and Microbiologists`;

const vicePresidentMessage = `Dear Colleagues,

It's an honour to address you as the newly elected Vice President of the Delhi Chapter of IAPM. I'm grateful for the trust you've placed in me and look forward to working with each of you in the years ahead.

Our chapter stands on a strong foundation, built by members across hospitals, colleges, and diagnostic centres. My aim is to build on that foundation, strengthening our academic activities, CMEs, and opportunities for young colleagues to learn, present, and grow.

I welcome your ideas and involvement as we move forward together.

Thank you for this opportunity to serve.

Dr Rajni
Director professor and Head
VMMC &SJH
Vice President, IAPM Delhi Chapter`;

const secretaryMessage = `Secretary's Message

Dear Colleagues,

It gives me great pleasure to share an update from the Delhi Chapter of the Indian Association of Pathologists and Microbiologists (DC-IAPM). While our Chapter was formally registered in 2025, our academic spirit and collegial network have remained active for the last couple of decades, built on the steady commitment of our seniors and the continued participation of members across institutions in Delhi and the NCR region.

In the current year, we have renewed our focus on regular, high-quality academic engagement. New and more active academic activities are being rolled out in the form of quarterly scientific sessions, and mid-year CME designed to be relevant for both early-career colleagues and experienced practitioners. We also had the first Annual Conference of the registered DC-IAPM in the first week of March 2026, envisioned as a flagship event that brought together pathologists and microbiologists from across the region for scientific deliberations, guest lectures, free paper and poster presentations, and meaningful peer interaction. We look forward to many more academic meetings in coming days.

A key administrative initiative this year is to unify and update our legacy member records. Many colleagues have been associated with the Chapter over the years, and we are working to consolidate the old members list, verify contact details, and ensure that every member is connected to upcoming communications and activities. I request all members, especially our senior colleagues and institutional representatives, to support this effort by sharing updated information and helping us reach members who may have changed workplaces or contact numbers. We are also making a professional interactive website for members intimation, updates and membership applications.

With your continued guidance and support, DC-IAPM will remain a vibrant forum for learning, collaboration, and professional excellence, following the footprints of our national body, IAPM.

Looking forward to your feedback and ideas for taking this chapter forward.

Warm regards,
Dr Prasenjit Das
Secretary
DC-IAPM`;

export const leadershipFallbacks = {
  president: {
    role: 'president',
    name: 'Prof (Dr) Puja Sakhuja',
    designation: 'Hon. President',
    organization: 'DC-IAPM',
    image_url: PresidentPhoto,
    excerpt: 'It is my humble honour to be the President of the Delhi Chapter of the Indian Association of Pathologists and Microbiologists.',
    message: presidentMessage,
    is_active: true,
  },
  vice_president: {
    role: 'vice_president',
    name: 'Prof (Dr) Rajni Prasad',
    designation: 'Hon Vice President',
    organization: 'DC-IAPM',
    image_url: VicePresidentPhoto,
    excerpt: "It's an honour to address you as the newly elected Vice President of the Delhi Chapter of IAPM.",
    message: vicePresidentMessage,
    is_active: true,
  },
  secretary: {
    role: 'secretary',
    name: 'Dr Prasenjit Das',
    designation: 'Secretary',
    organization: 'DC-IAPM',
    image_url: SecretaryPhoto,
    excerpt: 'It gives me great pleasure to share an update from the Delhi Chapter of the Indian Association of Pathologists and Microbiologists (DC-IAPM).',
    message: secretaryMessage,
    is_active: true,
  },
};

export function mergeLeadershipFallback(role, row) {
  const fallback = leadershipFallbacks[role];
  return {
    ...fallback,
    ...(row || {}),
    image_url: row?.image_url || fallback?.image_url || '',
    excerpt: row?.excerpt || fallback?.excerpt || '',
    message: row?.message || fallback?.message || '',
  };
}
