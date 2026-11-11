// Countries for profile origins.
//
// COUNTRY_CODES is the full ISO 3166-1 alpha-2 list (all 249 officially
// assigned codes) and must stay identical to the prof_country_iso CHECK
// constraint on profiles.country_code. Only the code is stored; the flag comes
// from flag-icons (see flagHTML) and the name from Intl.DisplayNames, so there's
// no name table to keep in sync.

export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
];

const CODE_SET = new Set(COUNTRY_CODES);
export function isCountryCode(code) {
  return typeof code === 'string' && CODE_SET.has(code);
}

// Flag as an image (flag-icons), not an emoji: Windows has no flag emoji and
// shows "PK" letters instead. Only codes on the ISO list ever reach the class
// attribute; anything else renders nothing. The SVG behind each class is a
// separate file, so the browser only downloads the flags that are on screen.
export function flagHTML(code) {
  if (!isCountryCode(code)) return '';
  const label = countryName(code).replace(/[&<>"']/g, '') + ' flag';
  return `<span class="fi fi-${code.toLowerCase()}" role="img" aria-label="${label}"></span>`;
}

let regionNames = null;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) {}

export function countryName(code) {
  if (!code) return '';
  try { return regionNames?.of(code) || code; } catch (e) { return code; }
}

// Same rules as the prof_locality_chars CHECK: no control chars, no
// zero-width/bidi characters, no ASCII symbols except ' - . (digits allowed).
const LOCALITY_BAD = /[\p{Cc}​-‏‪-‮⁦-⁩!"#$%&()*+,/:;<=>?@[\\\]^_`{|}~]/u;
export function isValidLocality(s) {
  return s.length <= 40 && !LOCALITY_BAD.test(s);
}
