/**
 * BioVerse - Exams Page Controller (exams.html)
 */

import '../features/exams/exams.js';
import { ChatBox } from '../components/chatBox.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    new ChatBox();
  } catch (err) {
    console.warn('BioBot init note:', err);
  }
});
