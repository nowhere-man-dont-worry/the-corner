// Registry of hair styles. Add a new style by importing its file here and
// adding it to the object below — see ./README.md for the full walkthrough.

import buzz from './buzz.js';
import mop from './mop.js';
import long from './long.js';
import bun from './bun.js';
import curls from './curls.js';
import cap from './cap.js';

export const hairStyles = { buzz, mop, long, bun, curls, cap };

// Names in the order they appear in the creator's chip row.
export const hairOrder = ['buzz', 'mop', 'long', 'bun', 'curls', 'cap'];
