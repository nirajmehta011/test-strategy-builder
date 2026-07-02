/**
 * rulesEngine.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Zero-API-token, purely client-side rules-based test case generator.
 * Parses requirement text → matches QA rule patterns → expands into detailed
 * TestCase objects that are 100% compatible with the existing TestCase interface.
 *
 * No network calls. No AI. Instant generation.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { TestCase, TestStep } from './aiService'

// ─── Internal Types ───────────────────────────────────────────────────────────

export interface ParsedFeature {
  title: string
  rawText: string
  entities: string[]       // e.g. ["user", "profile", "avatar"]
  actions: string[]        // e.g. ["login", "upload", "delete", "search"]
  uiElements: string[]     // e.g. ["button", "modal", "dropdown", "table"]
  dataTypes: string[]      // e.g. ["email", "password", "file", "date"]
  hasAuth: boolean
  hasCRUD: boolean
  hasUpload: boolean
  hasSearch: boolean
  hasPagination: boolean
  hasNavigation: boolean
  hasForms: boolean
  hasTable: boolean
  hasModal: boolean
  hasNotification: boolean
  hasPayment: boolean
  hasApi: boolean
  hasRole: boolean
  hasDashboard: boolean
  hasExport: boolean
  hasImport: boolean
  hasSettings: boolean
  hasReport: boolean
  hasNotif: boolean
  hasWorkflow: boolean
  scopeOption?: 'specific' | 'all'
  focusArea?: string
}

interface RuleTemplate {
  id: string
  category: 'functional' | 'ui' | 'validation' | 'negative' | 'boundary' | 'security' | 'performance' | 'accessibility' | 'responsive' | 'api'
  scenarioType: TestCase['scenarioType']
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  testType: string
  trigger: (f: ParsedFeature) => boolean
  title: (f: ParsedFeature) => string
  component: (f: ParsedFeature) => string
  precondition: (f: ParsedFeature) => string
  steps: (f: ParsedFeature) => Array<{ action: string; testData: string; expectedResult: string }>
  labels: string
  estimatedTime: string
}

// ─── Keyword Dictionaries ─────────────────────────────────────────────────────

const ACTION_KEYWORDS = [
  'login','logout','signup','register','create','add','edit','update','delete','remove',
  'search','filter','sort','upload','download','import','export','submit','cancel','save',
  'reset','refresh','navigate','redirect','open','close','select','deselect','toggle',
  'expand','collapse','drag','drop','scroll','copy','paste','share','send','approve',
  'reject','archive','restore','publish','unpublish','lock','unlock','assign','unassign',
  'invite','revoke','preview','view','print','email','notify','subscribe','unsubscribe',
  'checkout','pay','refund','confirm','verify','validate','generate','calculate',
]

const UI_ELEMENT_KEYWORDS = [
  'button','link','input','field','textbox','textarea','dropdown','select','checkbox',
  'radio','toggle','switch','slider','modal','dialog','popup','tooltip','menu','navbar',
  'sidebar','header','footer','breadcrumb','tab','table','grid','list','card','badge',
  'icon','label','placeholder','spinner','loader','progress','toast','alert','banner',
  'form','stepper','accordion','carousel','chart','graph','avatar','thumbnail','image',
  'video','file','attachment','calendar','datepicker','timepicker','paginator','search',
  'filter','tag','chip','panel','section','row','column','cell','row','pagination',
]

const DATA_TYPE_KEYWORDS = [
  'email','password','phone','mobile','number','integer','decimal','date','time','url',
  'file','image','pdf','csv','excel','json','xml','text','string','boolean','address',
  'zip','postal','name','username','token','id','uuid','code','otp','pin','ssn',
]

const AUTH_KEYWORDS = [
  'login','logout','signin','signout','register','signup','auth','password','token',
  'session','credential','permission','role','access','admin','user','account','profile',
  '2fa','mfa','oauth','sso','jwt','cookie',
]

const CRUD_KEYWORDS = ['create','add','edit','update','delete','remove','save','new','modify']
const UPLOAD_KEYWORDS = ['upload','attach','import','file','photo','image','document','drag','drop']
const SEARCH_KEYWORDS = ['search','filter','find','query','lookup','browse','explore']
const PAGINATION_KEYWORDS = ['page','pagination','next','previous','load more','infinite scroll','per page']
const NAVIGATION_KEYWORDS = ['navigate','redirect','route','link','menu','breadcrumb','back','forward']
const FORM_KEYWORDS = ['form','field','input','submit','validate','required','mandatory','optional']
const TABLE_KEYWORDS = ['table','grid','list','column','row','sort','header','data','record','entry']
const MODAL_KEYWORDS = ['modal','dialog','popup','overlay','drawer','panel','confirm']
const NOTIF_KEYWORDS = ['toast','alert','notification','message','warning','error','success','info']
const PAYMENT_KEYWORDS = ['payment','checkout','billing','invoice','card','stripe','paypal','price','amount','order']
const API_KEYWORDS = ['api','endpoint','request','response','payload','status','http','rest','graphql','webhook']
const ROLE_KEYWORDS = ['role','permission','admin','manager','user','access','privilege','authorization']
const DASHBOARD_KEYWORDS = ['dashboard','overview','summary','widget','metric','kpi','chart','graph','analytics']
const EXPORT_KEYWORDS = ['export','download','pdf','csv','excel','report','generate']
const IMPORT_KEYWORDS = ['import','upload','csv','excel','bulk','batch','migrate']
const SETTINGS_KEYWORDS = ['settings','preferences','configuration','profile','account','option']
const REPORT_KEYWORDS = ['report','analytics','insight','metric','statistic','chart','graph']
const WORKFLOW_KEYWORDS = ['workflow','pipeline','step','stage','approval','process','task','queue']

// ─── Parser ───────────────────────────────────────────────────────────────────

function hasAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

function extractEntities(text: string): string[] {
  // Extract noun phrases / capitalized words that look like entity names
  const words = text.split(/\s+/)
  const entities: string[] = []
  words.forEach(w => {
    const cleaned = w.replace(/[^a-zA-Z]/g, '')
    if (cleaned.length > 3 && /^[A-Z]/.test(cleaned) && !/^(The|And|For|With|From|That|This|When|Where|Should|Must|Will|Can|Has|Have|Are|Is|In|On|At|To|Of|Or|But)$/.test(cleaned)) {
      entities.push(cleaned)
    }
  })
  // Also pull from common feature patterns
  const featurePattern = /(?:feature|module|page|screen|section|component|view)s?\s+(?:for|of|called|named)?\s*([a-zA-Z\s]+?)(?:\.|,|;|$)/gi
  let m
  while ((m = featurePattern.exec(text)) !== null) {
    entities.push(m[1].trim())
  }
  return [...new Set(entities)].slice(0, 8)
}

function extractActions(text: string): string[] {
  const lower = text.toLowerCase()
  return ACTION_KEYWORDS.filter(k => lower.includes(k))
}

function extractUIElements(text: string): string[] {
  const lower = text.toLowerCase()
  return UI_ELEMENT_KEYWORDS.filter(k => lower.includes(k))
}

function extractDataTypes(text: string): string[] {
  const lower = text.toLowerCase()
  return DATA_TYPE_KEYWORDS.filter(k => lower.includes(k))
}

function cleanFilename(name: string): string {
  // Strip extensions
  let cleaned = name.replace(/\.(mp4|webm|mov|png|jpg|jpeg|gif|pdf|csv|xlsx|xls|docx|doc|txt|md)$/i, '');
  // Replace symbols/separators with spaces
  cleaned = cleaned.replace(/[-_]/g, ' ');
  // Strip non-semantic structural words that trigger false positive rules
  cleaned = cleaned.replace(/\b(video|screenshot|frame|figma|upload|spec|document|walkthrough|file|demo|test)\b/gi, ' ');
  return cleaned.trim();
}

export function parseRequirement(title: string, description: string): ParsedFeature {
  const descLower = description.toLowerCase();
  
  // 1. Detect scopeOption
  let scopeOption: 'all' | 'specific' = 'all';
  if (descLower.includes('limit to specific feature') || descLower.includes('scope focus option: limit to specific') || descLower.includes('scopeoption: specific')) {
    scopeOption = 'specific';
  }
  
  // 2. Extract focusArea / instructions
  let focusArea = '';
  // Match Focus/Feature Scope Instructions: OR Focus/Feature Scope Instructions: OR Focus Area:
  const focusMatches = description.match(/(?:focus\/feature scope instructions:|focus area:|instructions:)\s*([^\n]+)/i);
  if (focusMatches && focusMatches[1]) {
    focusArea = focusMatches[1].trim();
  }
  
  // 3. Extract uploaded files and clean them of extensions and structural keywords
  const fileNamesMatch = description.match(/(?:uploaded spec files:|video files:|screenshot frames:)\s*([^\n]+)/i);
  let cleanedFiles = '';
  if (fileNamesMatch && fileNamesMatch[1]) {
    const filesList = fileNamesMatch[1].split(',');
    cleanedFiles = filesList.map(cleanFilename).join(' ');
  }

  // 4. Compute text for matching keywords
  let matchText = '';
  if (scopeOption === 'specific') {
    // Strictly restrict keyword extraction to the focus/instructions text + title
    matchText = focusArea || title || '';
  } else {
    // Use title, focusArea (context instructions), and cleaned file/entity names
    matchText = `${title} ${focusArea} ${cleanedFiles}`;
  }

  // Double-clean matchText: strip out templates & technical terms from matching
  matchText = matchText.replace(/\b(video|screenshot|frame|figma|upload|spec|document|walkthrough|file|analysis|mode|source|details)\b/gi, ' ');

  const fullText = matchText.trim();
  
  return {
    title: title || 'Feature',
    rawText: fullText,
    entities: extractEntities(fullText),
    actions: extractActions(fullText),
    uiElements: extractUIElements(fullText),
    dataTypes: extractDataTypes(fullText),
    hasAuth: hasAny(fullText, AUTH_KEYWORDS),
    hasCRUD: hasAny(fullText, CRUD_KEYWORDS),
    hasUpload: hasAny(fullText, UPLOAD_KEYWORDS),
    hasSearch: hasAny(fullText, SEARCH_KEYWORDS),
    hasPagination: hasAny(fullText, PAGINATION_KEYWORDS),
    hasNavigation: hasAny(fullText, NAVIGATION_KEYWORDS),
    hasForms: hasAny(fullText, FORM_KEYWORDS),
    hasTable: hasAny(fullText, TABLE_KEYWORDS),
    hasModal: hasAny(fullText, MODAL_KEYWORDS),
    hasNotification: hasAny(fullText, NOTIF_KEYWORDS),
    hasPayment: hasAny(fullText, PAYMENT_KEYWORDS),
    hasApi: hasAny(fullText, API_KEYWORDS),
    hasRole: hasAny(fullText, ROLE_KEYWORDS),
    hasDashboard: hasAny(fullText, DASHBOARD_KEYWORDS),
    hasExport: hasAny(fullText, EXPORT_KEYWORDS),
    hasImport: hasAny(fullText, IMPORT_KEYWORDS),
    hasSettings: hasAny(fullText, SETTINGS_KEYWORDS),
    hasReport: hasAny(fullText, REPORT_KEYWORDS),
    hasNotif: hasAny(fullText, NOTIF_KEYWORDS),
    hasWorkflow: hasAny(fullText, WORKFLOW_KEYWORDS),
    scopeOption,
    focusArea: focusArea || undefined
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const entityLabel = (f: ParsedFeature) => {
  if (f.focusArea) {
    // Keep focusArea clean and short (up to 3-4 words)
    const cleanedFocus = f.focusArea.replace(/\b(validation|flow|creation|management|view|form|steps)\b/gi, '').trim();
    if (cleanedFocus) {
      const words = cleanedFocus.split(/\s+/).slice(0, 3).join(' ');
      if (words) return words;
    }
    return f.focusArea.split(/\s+/).slice(0, 3).join(' ');
  }
  if (f.entities && f.entities.length > 0) {
    return f.entities[0];
  }
  let t = f.title || 'Feature';
  // Strip common structural prefixes
  t = t.replace(/(visual walkthrough|screenshots|video|figma mockups|document|scraped website|document name|document specification content|url|doc):/gi, '');
  t = t.replace(/\.(mp4|webm|mov|png|jpg|jpeg|gif|pdf|csv|xlsx|xls|docx|doc|txt|md)$/i, '');
  t = t.replace(/[-_]/g, ' ');
  return t.trim() || 'Feature';
}

const entityPlural = (f: ParsedFeature) => {
  const e = entityLabel(f)
  return e.endsWith('s') ? e : `${e}s`
}

// ─── Rule Catalog (150+ rules) ────────────────────────────────────────────────

const RULE_CATALOG: RuleTemplate[] = [

  // ═══════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'AUTH-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'Critical', testType: 'Functional',
    labels: 'auth,login,smoke', estimatedTime: '20m',
    trigger: f => f.hasAuth,
    title: f => `Verify successful login with valid credentials for ${entityLabel(f)}`,
    component: () => 'Authentication',
    precondition: () => 'Application is accessible. Valid user account exists in the system.',
    steps: f => [
      { action: `Launch the application URL in the browser`, testData: 'https://app.example.com', expectedResult: 'Application loads successfully without errors. Login page is displayed.' },
      { action: 'Verify the Login page title and header text are displayed correctly', testData: 'N/A', expectedResult: 'Login page title matches the UX specification. Header is visible and properly styled.' },
      { action: 'Verify the application logo is visible and correctly placed on the page', testData: 'N/A', expectedResult: 'Logo renders correctly, is aligned as per design, and has no visual artifacts.' },
      { action: 'Verify the Username/Email input field is visible with correct placeholder text', testData: 'N/A', expectedResult: 'Username field is visible, placeholder text reads "Enter your email" or equivalent.' },
      { action: 'Verify the Password input field is visible with masking enabled by default', testData: 'N/A', expectedResult: 'Password field is visible, characters are masked with dots or asterisks.' },
      { action: `Enter a valid username/email in the Username field`, testData: 'testuser@example.com', expectedResult: 'Field accepts input. Typed text is clearly displayed in the field.' },
      { action: 'Click on the Password field to focus it and verify focus state styling', testData: 'N/A', expectedResult: 'Password field receives focus. A visible focus ring/border appears around the field.' },
      { action: 'Enter a valid password in the Password field', testData: 'P@ssword123!', expectedResult: 'Characters are entered and masked. No plain-text characters are visible.' },
      { action: 'Verify the Login button is enabled, visible, and has correct color and label', testData: 'N/A', expectedResult: 'Login button is enabled, labeled "Login" or "Sign In", and styled per design.' },
      { action: 'Click the Login button', testData: 'N/A', expectedResult: 'Button click is registered. A loading spinner appears on the button or page. Button is disabled to prevent double-submission.' },
      { action: 'Verify authentication API request is sent with correct payload', testData: 'email: testuser@example.com', expectedResult: 'Network request to /api/auth/login is sent with correct credentials in the payload.' },
      { action: 'Verify API response status code is 200/201 OK', testData: 'N/A', expectedResult: 'Server returns HTTP 200 or 201 with a valid auth token in the response body.' },
      { action: `Verify the user is redirected to the ${entityLabel(f)} dashboard after successful login`, testData: 'N/A', expectedResult: 'URL changes to the dashboard path. Dashboard page begins rendering.' },
      { action: 'Verify the authenticated user name/email is displayed in the top navigation or header', testData: 'N/A', expectedResult: 'Logged-in user\'s name or avatar is visible in the navbar/header area.' },
      { action: 'Verify no JavaScript console errors are present after login', testData: 'N/A', expectedResult: 'Browser console shows zero errors. Only informational or debug logs may appear.' },
    ],
  },
  {
    id: 'AUTH-002',
    category: 'negative', scenarioType: 'negative', priority: 'Critical', testType: 'Functional',
    labels: 'auth,login,negative', estimatedTime: '15m',
    trigger: f => f.hasAuth,
    title: () => 'Verify login is rejected with invalid credentials',
    component: () => 'Authentication',
    precondition: () => 'Application login page is accessible.',
    steps: () => [
      { action: 'Navigate to the application login page', testData: 'N/A', expectedResult: 'Login page loads successfully.' },
      { action: 'Clear any pre-filled values in both fields', testData: 'N/A', expectedResult: 'Both fields are empty and have their placeholder text.' },
      { action: 'Enter an invalid/incorrect email address in the Username field', testData: 'invalid@wrong.com', expectedResult: 'Text is accepted in the field. No validation error yet.' },
      { action: 'Enter an incorrect password in the Password field', testData: 'WrongPass999', expectedResult: 'Password characters are masked. No error yet shown.' },
      { action: 'Click the Login button', testData: 'N/A', expectedResult: 'Login button click is registered. A loading state begins.' },
      { action: 'Verify the API request returns a 401 Unauthorized error response', testData: 'N/A', expectedResult: 'Server returns HTTP 401. Error message payload is received.' },
      { action: 'Verify an appropriate error message is displayed to the user', testData: 'N/A', expectedResult: 'Error message such as "Invalid email or password" appears on screen, styled in red/error color.' },
      { action: 'Verify the user remains on the login page and is NOT redirected', testData: 'N/A', expectedResult: 'URL does not change. User stays on the login screen.' },
      { action: 'Verify that the password field is cleared or remains masked after failure', testData: 'N/A', expectedResult: 'Password field is either cleared or still masked. No plain text is exposed.' },
      { action: 'Verify the login form is still functional and the user can try again', testData: 'N/A', expectedResult: 'Form fields are interactive. User can enter new credentials and attempt login again.' },
      { action: 'Enter an empty username with a valid password and click Login', testData: 'password: P@ssword123!', expectedResult: 'Validation error fires: "Email is required" or similar. Request is NOT sent to the server.' },
      { action: 'Enter a valid username with an empty password and click Login', testData: 'email: testuser@example.com', expectedResult: 'Validation error fires: "Password is required". Request is NOT sent to the server.' },
    ],
  },
  {
    id: 'AUTH-003',
    category: 'security', scenarioType: 'security', priority: 'Critical', testType: 'Security',
    labels: 'auth,security,brute-force', estimatedTime: '20m',
    trigger: f => f.hasAuth,
    title: () => 'Verify account lockout after repeated failed login attempts',
    component: () => 'Authentication',
    precondition: () => 'Valid user account exists. Rate limiting / lockout policy is configured.',
    steps: () => [
      { action: 'Navigate to the login page', testData: 'N/A', expectedResult: 'Login page loads successfully.' },
      { action: 'Attempt login with invalid credentials (Attempt #1)', testData: 'email: test@test.com, password: Wrong1', expectedResult: 'Login fails with error message. Account NOT locked yet.' },
      { action: 'Attempt login with invalid credentials (Attempt #2)', testData: 'email: test@test.com, password: Wrong2', expectedResult: 'Login fails with error message.' },
      { action: 'Attempt login with invalid credentials (Attempt #3)', testData: 'email: test@test.com, password: Wrong3', expectedResult: 'Login fails. Warning may appear: "X attempts remaining".' },
      { action: 'Attempt login with invalid credentials (Attempt #4)', testData: 'email: test@test.com, password: Wrong4', expectedResult: 'Login fails. Countdown warning appears.' },
      { action: 'Attempt login with invalid credentials (Attempt #5)', testData: 'email: test@test.com, password: Wrong5', expectedResult: 'Account is now locked. Error message reads "Account locked due to too many failed attempts".' },
      { action: 'Attempt login with CORRECT credentials after lockout', testData: 'email: test@test.com, password: CorrectPass1!', expectedResult: 'Login is STILL denied. Lockout persists regardless of correct credentials.' },
      { action: 'Verify lockout duration or unlock instructions are communicated', testData: 'N/A', expectedResult: 'User sees message with lockout duration or link to reset/unlock the account.' },
      { action: 'Verify a lockout notification email is sent to the registered address', testData: 'N/A', expectedResult: 'Lockout notification email arrives with timestamp and account details.' },
      { action: 'Wait for lockout period to expire and attempt login with correct credentials', testData: 'email: test@test.com, password: CorrectPass1!', expectedResult: 'Login succeeds. Account is unlocked after the lockout period.' },
    ],
  },
  {
    id: 'AUTH-004',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'auth,logout', estimatedTime: '10m',
    trigger: f => f.hasAuth,
    title: () => 'Verify user can successfully log out of the application',
    component: () => 'Authentication',
    precondition: () => 'User is logged in to the application.',
    steps: () => [
      { action: 'Verify user is currently logged in and the dashboard/home page is visible', testData: 'N/A', expectedResult: 'Dashboard renders fully. User name/avatar is visible in the header.' },
      { action: 'Locate and click the user profile menu or account icon in the navigation', testData: 'N/A', expectedResult: 'Dropdown or menu appears with account options including "Logout".' },
      { action: 'Verify "Logout" option is visible and styled correctly in the dropdown', testData: 'N/A', expectedResult: '"Logout" item is visible, readable, and accessible.' },
      { action: 'Click the "Logout" option', testData: 'N/A', expectedResult: 'Logout action is initiated. A brief loading or transition state may appear.' },
      { action: 'Verify logout API call is made to the server', testData: 'N/A', expectedResult: 'POST /api/auth/logout request is sent. Server invalidates session/token.' },
      { action: 'Verify user is redirected to the Login page', testData: 'N/A', expectedResult: 'URL changes to /login or /signin. Login page is displayed.' },
      { action: 'Verify auth token/session cookie is cleared from the browser', testData: 'N/A', expectedResult: 'Auth cookie or localStorage token is removed. Application shows no auth state.' },
      { action: 'Attempt to navigate directly to a protected route (e.g., /dashboard) via URL bar', testData: '/dashboard', expectedResult: 'User is redirected back to the login page. Protected route is not accessible.' },
      { action: 'Verify pressing the browser "Back" button does not restore the authenticated session', testData: 'N/A', expectedResult: 'Browser navigates back but app detects no valid session and redirects to login.' },
    ],
  },
  {
    id: 'AUTH-005',
    category: 'security', scenarioType: 'security', priority: 'Critical', testType: 'Security',
    labels: 'auth,session', estimatedTime: '15m',
    trigger: f => f.hasAuth,
    title: () => 'Verify session timeout and auto-logout behavior',
    component: () => 'Authentication',
    precondition: () => 'User is logged in. Session timeout is configured (e.g., 30 minutes of inactivity).',
    steps: () => [
      { action: 'Log in with valid credentials', testData: 'N/A', expectedResult: 'Login successful. Dashboard visible.' },
      { action: 'Leave the application idle for the session timeout duration', testData: 'Idle for 30 minutes', expectedResult: 'No activity performed during the timeout window.' },
      { action: 'Attempt any action (click a button, navigate) after timeout', testData: 'N/A', expectedResult: 'Session is detected as expired. User is automatically redirected to login.' },
      { action: 'Verify a session-expired notification message appears', testData: 'N/A', expectedResult: 'Message such as "Your session has expired. Please log in again." is shown.' },
      { action: 'Verify API calls made after session expiry return 401 Unauthorized', testData: 'N/A', expectedResult: 'All protected API calls return 401. No data is returned.' },
      { action: 'Log in again with valid credentials', testData: 'N/A', expectedResult: 'Login succeeds. Fresh session is established.' },
      { action: 'Verify previously performed actions or data are correctly restored', testData: 'N/A', expectedResult: 'App state (if persisted) is restored or user is on a clean dashboard state.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. CRUD RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'CRUD-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'Critical', testType: 'Functional',
    labels: 'crud,create,functional', estimatedTime: '20m',
    trigger: f => f.hasCRUD,
    title: f => `Verify successful creation of a new ${entityLabel(f)} record`,
    component: f => entityLabel(f),
    precondition: f => `User is logged in with create permissions for ${entityLabel(f)}.`,
    steps: f => [
      { action: `Navigate to the ${entityPlural(f)} list/management page`, testData: 'N/A', expectedResult: `${entityPlural(f)} page loads. Existing records (if any) are displayed.` },
      { action: `Verify "Add New" / "Create ${entityLabel(f)}" button is visible and enabled`, testData: 'N/A', expectedResult: 'Button is visible, enabled, and correctly labeled.' },
      { action: `Click the "Add New ${entityLabel(f)}" button`, testData: 'N/A', expectedResult: 'A form, modal, or new page opens to create a new record.' },
      { action: 'Verify all required form fields are visible with correct labels and placeholders', testData: 'N/A', expectedResult: 'All form fields are rendered. Required fields have a * or "Required" indicator.' },
      { action: 'Fill in all required fields with valid data', testData: 'Name: "Test Record", Status: "Active"', expectedResult: 'Fields accept the input. Typed data is visible in each field.' },
      { action: 'Fill in all optional fields with valid data', testData: 'Description: "Test description"', expectedResult: 'Optional fields accept input without errors.' },
      { action: 'Verify any character limit counters update correctly as user types', testData: 'N/A', expectedResult: 'Character count (e.g., "50/200") increments with each keystroke.' },
      { action: 'Click the "Save" / "Create" / "Submit" button', testData: 'N/A', expectedResult: 'Form submission is triggered. Loading indicator appears briefly.' },
      { action: 'Verify the API POST request is sent with all form data', testData: 'N/A', expectedResult: 'POST /api/{entity} is called with the correct JSON payload.' },
      { action: 'Verify a success toast/notification appears confirming creation', testData: 'N/A', expectedResult: `Toast: "${entityLabel(f)} created successfully" appears in success color (green).` },
      { action: `Verify the new ${entityLabel(f)} record appears in the list`, testData: 'N/A', expectedResult: 'Newly created record is visible in the list with all entered data.' },
      { action: 'Verify the record count/total increments by 1', testData: 'N/A', expectedResult: 'Record count (if shown) increases from previous count + 1.' },
      { action: 'Open the newly created record and verify all saved fields match entered data', testData: 'N/A', expectedResult: 'Detail view shows exactly the data entered during creation.' },
    ],
  },
  {
    id: 'CRUD-002',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'crud,edit,update', estimatedTime: '18m',
    trigger: f => f.hasCRUD,
    title: f => `Verify successful update/edit of an existing ${entityLabel(f)} record`,
    component: f => entityLabel(f),
    precondition: f => `At least one ${entityLabel(f)} record exists. User has edit permission.`,
    steps: f => [
      { action: `Navigate to the ${entityPlural(f)} list page`, testData: 'N/A', expectedResult: 'List page loads with existing records.' },
      { action: `Locate an existing ${entityLabel(f)} record to edit`, testData: 'N/A', expectedResult: 'Record is visible in the list.' },
      { action: `Click the "Edit" action (pencil icon, context menu, or "Edit" button) for that record`, testData: 'N/A', expectedResult: 'Edit form/modal opens with the record\'s current values pre-populated.' },
      { action: 'Verify all fields are pre-filled with the existing record data', testData: 'N/A', expectedResult: 'All fields show current values. No field is blank or shows placeholder text.' },
      { action: 'Modify the Name/Title field with new valid data', testData: 'New Name: "Updated Record Name"', expectedResult: 'Field accepts new value. Old value is replaced.' },
      { action: 'Modify at least two other fields with new valid values', testData: 'Status: "Inactive", Description: "Updated desc"', expectedResult: 'Fields accept new values.' },
      { action: 'Click the "Save" / "Update" button', testData: 'N/A', expectedResult: 'Form submits. Loading indicator appears.' },
      { action: 'Verify API PATCH/PUT request is sent with updated payload', testData: 'N/A', expectedResult: 'PATCH or PUT /api/{entity}/{id} sent with modified fields.' },
      { action: 'Verify a success toast/notification appears confirming the update', testData: 'N/A', expectedResult: 'Toast: "Record updated successfully" appears.' },
      { action: 'Verify the updated values are reflected immediately in the list view', testData: 'N/A', expectedResult: 'List row shows the new Name and Status without requiring a page refresh.' },
      { action: 'Open the updated record\'s detail/view page and verify all changes are persisted', testData: 'N/A', expectedResult: 'Detail view displays new Name, Status, and Description exactly as modified.' },
      { action: 'Refresh the page and verify the updated data persists after reload', testData: 'N/A', expectedResult: 'After refresh, record still shows updated values. Changes are not lost.' },
    ],
  },
  {
    id: 'CRUD-003',
    category: 'functional', scenarioType: 'negative', priority: 'High', testType: 'Functional',
    labels: 'crud,delete,negative', estimatedTime: '15m',
    trigger: f => f.hasCRUD,
    title: f => `Verify deletion of a ${entityLabel(f)} record with confirmation dialog`,
    component: f => entityLabel(f),
    precondition: f => `At least one ${entityLabel(f)} record exists. User has delete permission.`,
    steps: f => [
      { action: `Navigate to the ${entityPlural(f)} list page`, testData: 'N/A', expectedResult: 'List page loads with at least one record.' },
      { action: `Locate a record to delete and click the "Delete" action (trash icon or context menu)`, testData: 'N/A', expectedResult: 'Delete action is triggered.' },
      { action: 'Verify a confirmation dialog/modal appears asking to confirm deletion', testData: 'N/A', expectedResult: 'Modal opens with message: "Are you sure you want to delete this record? This action cannot be undone."' },
      { action: 'Verify the modal has both "Confirm" / "Delete" and "Cancel" buttons', testData: 'N/A', expectedResult: 'Both buttons are visible, labeled correctly, and styled distinctly (red for delete, neutral for cancel).' },
      { action: 'Click the "Cancel" button', testData: 'N/A', expectedResult: 'Modal closes. Record is NOT deleted. Record remains in the list.' },
      { action: 'Trigger the delete action again and click "Confirm Delete" in the modal', testData: 'N/A', expectedResult: 'Deletion request is sent to the server.' },
      { action: 'Verify API DELETE request is sent with the correct record ID', testData: 'N/A', expectedResult: 'DELETE /api/{entity}/{id} is called. Server responds with 200 or 204.' },
      { action: 'Verify success notification appears confirming deletion', testData: 'N/A', expectedResult: 'Toast: "Record deleted successfully" appears in the UI.' },
      { action: 'Verify the deleted record is no longer visible in the list', testData: 'N/A', expectedResult: 'List is updated. The deleted record is absent. Other records are unaffected.' },
      { action: 'Verify the total record count decrements by 1', testData: 'N/A', expectedResult: 'Count (if displayed) decreases by 1.' },
      { action: 'Attempt to access the deleted record\'s detail page directly via URL', testData: '/entity/{deleted-id}', expectedResult: 'Page shows a 404 or "Record not found" message. No data is displayed.' },
    ],
  },
  {
    id: 'CRUD-004',
    category: 'validation', scenarioType: 'negative', priority: 'High', testType: 'Functional',
    labels: 'crud,create,validation', estimatedTime: '15m',
    trigger: f => f.hasCRUD && f.hasForms,
    title: f => `Verify form validation on ${entityLabel(f)} creation — required field errors`,
    component: f => entityLabel(f),
    precondition: f => `${entityLabel(f)} create form is accessible.`,
    steps: f => [
      { action: `Open the Create ${entityLabel(f)} form`, testData: 'N/A', expectedResult: 'Form opens with all fields in default empty state.' },
      { action: 'Leave all fields empty and click the "Save"/"Submit" button', testData: 'N/A', expectedResult: 'Form submission is blocked. Validation errors appear immediately.' },
      { action: 'Verify required field error messages appear next to each mandatory field', testData: 'N/A', expectedResult: 'Each required field shows a red error message: "This field is required" or similar.' },
      { action: 'Verify the form border/outline changes to red on each required field', testData: 'N/A', expectedResult: 'Required empty fields have a red outline to visually indicate the error state.' },
      { action: 'Verify no API call is made when validation fails', testData: 'N/A', expectedResult: 'Network tab shows zero requests. Form is not submitted to the backend.' },
      { action: 'Fill in the first required field with valid data', testData: 'Name: "Valid Name"', expectedResult: 'Error message for that field disappears. Field border returns to normal state.' },
      { action: 'Verify other required fields still show their error messages', testData: 'N/A', expectedResult: 'Only the filled field clears its error. Remaining empty required fields still show errors.' },
      { action: 'Fill in all remaining required fields with valid data', testData: 'N/A', expectedResult: 'All field errors clear. Form is in a valid state.' },
      { action: 'Click the "Save"/"Submit" button again', testData: 'N/A', expectedResult: 'Form submits successfully. Success notification appears.' },
      { action: 'Verify the record is created and appears in the list', testData: 'N/A', expectedResult: 'New record is visible in the list with all entered data.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. FORM VALIDATION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'FORM-001',
    category: 'validation', scenarioType: 'negative', priority: 'High', testType: 'Functional',
    labels: 'form,email,validation', estimatedTime: '15m',
    trigger: f => f.hasForms && f.dataTypes.includes('email'),
    title: () => 'Verify email field validation — format and edge cases',
    component: () => 'Form Validation',
    precondition: () => 'Form with email field is accessible.',
    steps: () => [
      { action: 'Locate the Email input field on the form', testData: 'N/A', expectedResult: 'Email field is visible with placeholder "Enter email address" or similar.' },
      { action: 'Enter an email missing the @ symbol', testData: 'invalidemail.com', expectedResult: 'Validation error appears: "Please enter a valid email address".' },
      { action: 'Enter an email missing the domain extension', testData: 'user@domain', expectedResult: 'Validation error appears. Field marked invalid.' },
      { action: 'Enter an email with spaces', testData: 'user @domain.com', expectedResult: 'Validation error appears. Email with spaces is not accepted.' },
      { action: 'Enter an email with special characters in the local part', testData: 'user!#$@domain.com', expectedResult: 'System either accepts valid RFC-5321 emails or shows an error for unsupported characters.' },
      { action: 'Enter a valid email address', testData: 'valid.user+tag@example.co.uk', expectedResult: 'Email is accepted. Validation error disappears.' },
      { action: 'Enter an email exceeding the maximum character limit (e.g., 254 chars)', testData: 'a'.repeat(250) + '@b.com', expectedResult: 'Field either prevents input beyond the limit or shows a character-limit error.' },
      { action: 'Paste a valid email address using keyboard shortcut Ctrl+V / Cmd+V', testData: 'pasted@example.com', expectedResult: 'Pasted email is accepted and displayed in the field.' },
      { action: 'Enter an email and verify trimming of leading/trailing whitespace on submit', testData: '  user@example.com  ', expectedResult: 'Whitespace is stripped. Field value is treated as "user@example.com".' },
      { action: 'Submit the form with a valid email', testData: 'valid@example.com', expectedResult: 'Form submission succeeds. No email validation errors.' },
    ],
  },
  {
    id: 'FORM-002',
    category: 'validation', scenarioType: 'negative', priority: 'Critical', testType: 'Security',
    labels: 'form,password,validation,security', estimatedTime: '18m',
    trigger: f => f.hasForms && f.dataTypes.includes('password'),
    title: () => 'Verify password field validation — strength rules and masking',
    component: () => 'Form Validation',
    precondition: () => 'Registration/password form is accessible.',
    steps: () => [
      { action: 'Locate the Password input field', testData: 'N/A', expectedResult: 'Password field visible, type="password", characters masked.' },
      { action: 'Enter a password shorter than the minimum length (e.g., < 8 chars)', testData: 'pass', expectedResult: 'Validation error: "Password must be at least 8 characters".' },
      { action: 'Enter a password without uppercase letters', testData: 'password123!', expectedResult: 'Validation error: "Password must contain at least one uppercase letter" (if rule applies).' },
      { action: 'Enter a password without a number', testData: 'Password!', expectedResult: 'Validation error: "Password must contain at least one number" (if rule applies).' },
      { action: 'Enter a password without special characters', testData: 'Password123', expectedResult: 'Validation error: "Password must contain at least one special character" (if rule applies).' },
      { action: 'Enter a strong password meeting all rules', testData: 'Str0ng@Pass!', expectedResult: 'All validation errors clear. Strength indicator shows "Strong" (if implemented).' },
      { action: 'Verify password characters are masked and not readable', testData: 'N/A', expectedResult: 'Password characters show as dots/asterisks. Plain text is not visible.' },
      { action: 'Click "Show Password" toggle if available', testData: 'N/A', expectedResult: 'Password becomes visible in plain text. Toggle icon changes to "hide" state.' },
      { action: 'Click "Hide Password" toggle', testData: 'N/A', expectedResult: 'Password is re-masked. Characters hidden again.' },
      { action: 'Enter a password in the Confirm Password field that does NOT match', testData: 'Different@Pass!', expectedResult: 'Validation error: "Passwords do not match" appears.' },
      { action: 'Update Confirm Password to match the original password', testData: 'Str0ng@Pass!', expectedResult: 'Mismatch error disappears. Both fields validated as matching.' },
      { action: 'Inspect the page source/DOM to verify password value is not exposed', testData: 'N/A', expectedResult: 'Password value is not exposed in page source, URL params, or browser autocomplete in plain text.' },
    ],
  },
  {
    id: 'FORM-003',
    category: 'boundary', scenarioType: 'boundary', priority: 'High', testType: 'Functional',
    labels: 'form,boundary,character-limit', estimatedTime: '12m',
    trigger: f => f.hasForms,
    title: () => 'Verify text field character limit boundary value behavior',
    component: () => 'Form Validation',
    precondition: () => 'Form with character-limited text fields is accessible.',
    steps: () => [
      { action: 'Locate a text field with a defined character limit (e.g., Name: 100 chars)', testData: 'N/A', expectedResult: 'Field is visible. Character counter (e.g., "0/100") is shown below the field.' },
      { action: 'Enter 0 characters and click Submit', testData: 'Empty string', expectedResult: 'If required, validation error appears. Counter shows "0/100".' },
      { action: 'Enter exactly 1 character (minimum boundary)', testData: '"A"', expectedResult: 'Field accepts 1 character. Counter shows "1/100". No error.' },
      { action: 'Enter characters up to 1 less than the max (max-1)', testData: '"A" × 99 characters', expectedResult: 'Field accepts 99 chars. Counter shows "99/100".' },
      { action: 'Enter exactly the maximum number of characters (max)', testData: '"A" × 100 characters', expectedResult: 'Field accepts exactly 100 chars. Counter shows "100/100". Field may highlight.' },
      { action: 'Attempt to type one more character beyond the limit (max+1)', testData: 'Type 101st character', expectedResult: 'Character is rejected. Field does not accept input beyond max. Counter stays at "100/100".' },
      { action: 'Paste text that exceeds the character limit', testData: 'Paste 200 chars of text', expectedResult: 'Pasted text is truncated to the max limit. Counter shows "100/100".' },
      { action: 'Verify the counter color changes to red or warning at the max', testData: 'N/A', expectedResult: 'At max limit, counter text turns red or shows a warning color.' },
      { action: 'Delete characters and verify the counter decrements correctly', testData: 'Delete 50 chars', expectedResult: 'Counter decrements from 100 to 50 as characters are deleted.' },
      { action: 'Submit the form with exactly max characters in the field', testData: 'N/A', expectedResult: 'Form submits successfully. Max-length value is saved correctly.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. SEARCH & FILTER RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'SEARCH-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'search,functional', estimatedTime: '18m',
    trigger: f => f.hasSearch,
    title: f => `Verify search functionality on ${entityLabel(f)} list — basic and advanced scenarios`,
    component: f => `${entityLabel(f)} Search`,
    precondition: f => `At least 5 ${entityLabel(f)} records exist in the system.`,
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} list/search page`, testData: 'N/A', expectedResult: 'Page loads with all records visible.' },
      { action: 'Verify the search bar is visible, accessible, and has placeholder text', testData: 'N/A', expectedResult: 'Search input is displayed with placeholder such as "Search by name...".' },
      { action: 'Click the search bar to focus it', testData: 'N/A', expectedResult: 'Search bar receives focus. Focus ring/border appears.' },
      { action: 'Enter a search term matching a known record exactly', testData: 'Known record name', expectedResult: 'Results narrow to matching records. Non-matching records disappear.' },
      { action: 'Verify matching text is highlighted in search results', testData: 'N/A', expectedResult: 'Matching search keyword is bolded or highlighted in the results list.' },
      { action: 'Enter a partial search term (first 3 characters)', testData: 'First 3 chars of a name', expectedResult: 'All records whose name starts with those 3 characters are shown.' },
      { action: 'Enter a search term in UPPERCASE', testData: 'UPPERCASE TERM', expectedResult: 'Search is case-insensitive. Results match regardless of case.' },
      { action: 'Enter a search term with leading/trailing spaces', testData: '  search term  ', expectedResult: 'Search strips whitespace and returns correct results.' },
      { action: 'Enter a search term that matches NO records', testData: 'zzz_no_match_xyz', expectedResult: 'Empty state is displayed: "No results found for your search." List is empty.' },
      { action: 'Clear the search field using the clear/× button or Backspace', testData: 'N/A', expectedResult: 'Search term is cleared. All records reappear in the full list.' },
      { action: 'Enter special characters in the search field', testData: '@#$%^&*()', expectedResult: 'App handles special chars gracefully. Either no results shown or results filtered. No crash.' },
      { action: 'Enter a very long string in the search field', testData: '"A" × 200 characters', expectedResult: 'App handles long input gracefully. No crash or layout break.' },
    ],
  },
  {
    id: 'SEARCH-002',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'filter,functional', estimatedTime: '15m',
    trigger: f => f.hasSearch,
    title: f => `Verify filter/facet functionality on ${entityLabel(f)} list`,
    component: f => `${entityLabel(f)} Filters`,
    precondition: f => `Multiple ${entityLabel(f)} records with different statuses/types exist.`,
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} list page`, testData: 'N/A', expectedResult: 'Full list loads with all records.' },
      { action: 'Locate and click the "Filter" button or filter panel icon', testData: 'N/A', expectedResult: 'Filter panel/dropdown expands. Available filter options are visible.' },
      { action: 'Select a specific Status filter (e.g., "Active" only)', testData: 'Status: Active', expectedResult: 'List is filtered. Only "Active" records are displayed.' },
      { action: 'Verify the filter count/badge shows the number of active filters', testData: 'N/A', expectedResult: 'Filter indicator shows "1 filter applied" or similar badge count.' },
      { action: 'Add a second filter (e.g., filter by Category)', testData: 'Category: Type A', expectedResult: 'List further narrows. Only records matching both filters appear.' },
      { action: 'Verify the combined filter count shows "2 filters applied"', testData: 'N/A', expectedResult: 'Filter badge updates to show 2 active filters.' },
      { action: 'Remove one filter by clicking its × remove button', testData: 'N/A', expectedResult: 'That filter is removed. List expands to show all records matching the remaining filter.' },
      { action: 'Click "Clear All Filters" or "Reset"', testData: 'N/A', expectedResult: 'All filters cleared. Full list is restored. Filter badge disappears.' },
      { action: 'Apply a filter and then perform a search within filtered results', testData: 'Search: "test" within Active records', expectedResult: 'Search operates within filtered scope. Results match both filter and search.' },
      { action: 'Verify applied filters persist after page refresh (if designed to persist)', testData: 'N/A', expectedResult: 'After page reload, filters are re-applied (if URL params or storage used).' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. UPLOAD RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'UPLOAD-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'upload,file,functional', estimatedTime: '20m',
    trigger: f => f.hasUpload,
    title: f => `Verify file upload functionality for ${entityLabel(f)}`,
    component: f => `${entityLabel(f)} Upload`,
    precondition: () => 'Upload form is accessible. Test files of valid type and size are available.',
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} upload section`, testData: 'N/A', expectedResult: 'Upload area is visible with instructions and file type guidance.' },
      { action: 'Verify the upload zone displays accepted file types and max file size', testData: 'N/A', expectedResult: 'Text or tooltip shows: "Accepted: PDF, JPG, PNG | Max size: 10MB" or similar.' },
      { action: 'Click the "Choose File" or "Browse" button', testData: 'N/A', expectedResult: 'OS file picker dialog opens.' },
      { action: 'Select a valid file of the correct type and within size limit', testData: 'test-document.pdf (2MB)', expectedResult: 'File is selected. File name appears in the upload zone.' },
      { action: 'Verify the selected file name is displayed in the upload area', testData: 'N/A', expectedResult: 'File name "test-document.pdf" is visible. File size may also be shown.' },
      { action: 'Click the "Upload" button to start the upload', testData: 'N/A', expectedResult: 'Upload starts. A progress bar or percentage indicator appears.' },
      { action: 'Verify upload progress bar increments from 0% to 100%', testData: 'N/A', expectedResult: 'Progress bar smoothly advances. Percentage counter increases.' },
      { action: 'Verify success confirmation appears after upload completes', testData: 'N/A', expectedResult: 'Toast or inline message: "File uploaded successfully" appears.' },
      { action: 'Verify the uploaded file is accessible/downloadable after upload', testData: 'N/A', expectedResult: 'Uploaded file is listed. Clicking download retrieves the same file.' },
      { action: 'Attempt to upload an invalid file type (e.g., .exe when only PDF allowed)', testData: 'malicious.exe (1MB)', expectedResult: 'File is rejected immediately. Error: "Invalid file type. Please upload PDF, JPG, or PNG."' },
      { action: 'Attempt to upload a file exceeding the maximum size limit', testData: 'large-file.pdf (50MB)', expectedResult: 'File is rejected. Error: "File size exceeds the 10MB limit." Upload is not attempted.' },
      { action: 'Attempt to upload an empty file (0 bytes)', testData: 'empty.pdf (0 bytes)', expectedResult: 'File is rejected. Error: "Cannot upload an empty file."' },
      { action: 'Test drag-and-drop file upload (if supported)', testData: 'Drag valid PDF to upload zone', expectedResult: 'Drop zone highlights on drag-over. File is accepted and uploaded on drop.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. TABLE & PAGINATION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'TABLE-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'table,sort,pagination', estimatedTime: '18m',
    trigger: f => f.hasTable,
    title: f => `Verify data table sorting and pagination for ${entityLabel(f)} list`,
    component: f => `${entityLabel(f)} Table`,
    precondition: f => `More than 10 ${entityLabel(f)} records exist to enable pagination.`,
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} data table page`, testData: 'N/A', expectedResult: 'Table loads with headers and data rows.' },
      { action: 'Verify all table column headers are visible and correctly labeled', testData: 'N/A', expectedResult: 'Headers: Name, Status, Created Date, Actions, etc. are visible.' },
      { action: 'Click on a sortable column header (e.g., "Name")', testData: 'Column: Name', expectedResult: 'Table sorts ascending by Name. Sort arrow (↑) appears on the header.' },
      { action: 'Click the same column header again to reverse the sort order', testData: 'N/A', expectedResult: 'Table sorts descending by Name. Sort arrow changes to (↓).' },
      { action: 'Click a different column header (e.g., "Created Date") to sort by it', testData: 'Column: Created Date', expectedResult: 'Table sorts by date. Previous column\'s sort indicator clears.' },
      { action: 'Verify the pagination controls are visible below the table', testData: 'N/A', expectedResult: 'Pagination shows: "Showing 1–10 of X results" and Previous/Next buttons.' },
      { action: 'Verify "Previous" button is disabled on the first page', testData: 'N/A', expectedResult: '"Previous" button is disabled/grayed and unclickable on page 1.' },
      { action: 'Click the "Next" button to navigate to page 2', testData: 'N/A', expectedResult: 'Page 2 loads. New set of records is displayed. "Previous" button is now enabled.' },
      { action: 'Change the items-per-page dropdown from 10 to 25', testData: 'Per page: 25', expectedResult: 'Table reloads showing 25 records. Pagination updates accordingly.' },
      { action: 'Click the "Last Page" button or enter the final page number', testData: 'N/A', expectedResult: 'Last page loads. "Next" button is disabled. Partial page of records shown.' },
      { action: 'Verify "Next" button is disabled on the last page', testData: 'N/A', expectedResult: '"Next" / "Last Page" buttons are disabled or hidden on the final page.' },
      { action: 'Verify the total record count displayed matches actual records in the database', testData: 'N/A', expectedResult: 'Pagination summary "X of Y total" matches the actual total count.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. MODAL / DIALOG RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'MODAL-001',
    category: 'ui', scenarioType: 'ui_ux', priority: 'Medium', testType: 'UI/UX',
    labels: 'modal,ui,ux', estimatedTime: '12m',
    trigger: f => f.hasModal,
    title: () => 'Verify modal dialog open, close, and keyboard accessibility',
    component: () => 'Modal/Dialog',
    precondition: () => 'Page with a modal trigger button is accessible.',
    steps: () => [
      { action: 'Locate the button/link that triggers the modal dialog', testData: 'N/A', expectedResult: 'Trigger button is visible and enabled.' },
      { action: 'Click the trigger button to open the modal', testData: 'N/A', expectedResult: 'Modal opens with smooth fade/slide animation. Backdrop overlay appears behind it.' },
      { action: 'Verify the modal overlay/backdrop darkens the background content', testData: 'N/A', expectedResult: 'Semi-transparent overlay covers the background. Background content is non-interactive.' },
      { action: 'Verify modal title, body content, and action buttons are visible and correctly styled', testData: 'N/A', expectedResult: 'All modal sections render. Title, content, and buttons are properly aligned.' },
      { action: 'Verify focus is automatically trapped inside the modal', testData: 'Press Tab key', expectedResult: 'Tab focus cycles within the modal only. Background elements are not focusable.' },
      { action: 'Close the modal by clicking the × (close) button in the top-right corner', testData: 'N/A', expectedResult: 'Modal closes with animation. Overlay disappears. Background content is interactive again.' },
      { action: 'Reopen the modal and close it by clicking outside on the backdrop', testData: 'N/A', expectedResult: 'Modal dismisses when clicking outside (if designed behavior). Backdrop click works.' },
      { action: 'Reopen the modal and close it by pressing the Escape key', testData: 'Keyboard: Escape key', expectedResult: 'Modal closes on Escape key press. Focus returns to the trigger button.' },
      { action: 'Verify that closing the modal restores scroll position of the page behind it', testData: 'N/A', expectedResult: 'After modal close, page is at the same scroll position as before opening.' },
      { action: 'Verify modal is responsive and renders correctly on mobile viewport', testData: 'Viewport: 375px width', expectedResult: 'Modal adapts to mobile. Content is readable and buttons are full-width.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. NAVIGATION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'NAV-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'navigation,routing', estimatedTime: '15m',
    trigger: f => f.hasNavigation,
    title: f => `Verify navigation and routing for ${entityLabel(f)} module`,
    component: () => 'Navigation',
    precondition: () => 'User is authenticated. Application main navigation is visible.',
    steps: f => [
      { action: 'Verify the main navigation bar/sidebar is visible on all pages', testData: 'N/A', expectedResult: 'Navigation is consistently visible. Active page is highlighted.' },
      { action: `Click the "${entityLabel(f)}" navigation link in the sidebar/navbar`, testData: 'N/A', expectedResult: `URL changes to /${entityLabel(f).toLowerCase()}. ${entityLabel(f)} page renders.` },
      { action: 'Verify the active navigation item is highlighted/active-styled', testData: 'N/A', expectedResult: `"${entityLabel(f)}" nav item shows an active state (bold, colored, or underlined).` },
      { action: 'Navigate to a sub-page and verify breadcrumbs update correctly', testData: 'N/A', expectedResult: 'Breadcrumb trail shows: Home > {Module} > {Sub-page}.' },
      { action: 'Click the browser "Back" button', testData: 'N/A', expectedResult: 'Previous page loads correctly. URL updates to previous path.' },
      { action: 'Click the browser "Forward" button', testData: 'N/A', expectedResult: 'Returns to the page navigated away from.' },
      { action: 'Navigate to a protected route without authentication (open in incognito)', testData: 'Direct URL: /protected-page', expectedResult: 'Redirect to login page. Protected page is not rendered.' },
      { action: 'Navigate to a non-existent URL path', testData: '/this-does-not-exist', expectedResult: '404 page is displayed with a friendly message and a "Go Home" link.' },
      { action: 'Verify clicking any external link opens in a new tab', testData: 'N/A', expectedResult: 'External links open in new browser tab/window. Current app is not replaced.' },
      { action: 'Verify the page title updates in the browser tab for each route', testData: 'N/A', expectedResult: 'Browser tab title changes to reflect the current page (e.g., "Dashboard | App Name").' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. EXPORT / DOWNLOAD RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'EXPORT-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'Medium', testType: 'Functional',
    labels: 'export,download,csv,pdf', estimatedTime: '15m',
    trigger: f => f.hasExport,
    title: f => `Verify data export functionality from ${entityLabel(f)} module`,
    component: f => `${entityLabel(f)} Export`,
    precondition: f => `${entityLabel(f)} records exist. User has export permission.`,
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} list page with records`, testData: 'N/A', expectedResult: 'List loads with data.' },
      { action: 'Locate the "Export" button or dropdown menu', testData: 'N/A', expectedResult: 'Export button is visible and enabled.' },
      { action: 'Click the Export button/dropdown to see available formats', testData: 'N/A', expectedResult: 'Options visible: Export as CSV, Export as Excel, Export as PDF (or applicable formats).' },
      { action: 'Select "Export as CSV"', testData: 'N/A', expectedResult: 'CSV file download begins. Browser downloads the file.' },
      { action: 'Verify the downloaded CSV file contains all expected columns', testData: 'N/A', expectedResult: 'CSV headers match table columns. No columns are missing.' },
      { action: 'Verify the CSV data rows match the records in the UI', testData: 'N/A', expectedResult: 'Row count in CSV equals total records. Data values match the displayed table.' },
      { action: 'Apply a filter on the list and then export', testData: 'Filter: Status=Active, then export', expectedResult: 'Exported file contains only filtered (Active) records, not all records.' },
      { action: 'Select "Export as PDF" (if available)', testData: 'N/A', expectedResult: 'PDF downloads with correct formatting, table data, and header/footer.' },
      { action: 'Verify the export works for an empty dataset', testData: 'N/A', expectedResult: 'Empty CSV/Excel with headers only is downloaded, or an appropriate message is shown.' },
      { action: 'Verify export completes within an acceptable time for large datasets', testData: '1000+ records', expectedResult: 'Export completes within 5–10 seconds. Progress indicator shown if export is slow.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. NOTIFICATION / TOAST RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'NOTIF-001',
    category: 'ui', scenarioType: 'ui_ux', priority: 'Medium', testType: 'UI/UX',
    labels: 'toast,notification,ui', estimatedTime: '10m',
    trigger: f => f.hasNotification,
    title: () => 'Verify toast notification display, timing, and dismiss behavior',
    component: () => 'Notifications',
    precondition: () => 'Application is accessible. Actions that trigger notifications are available.',
    steps: () => [
      { action: 'Perform an action that triggers a success notification (e.g., create a record)', testData: 'N/A', expectedResult: 'Green success toast appears in the top-right (or specified) corner of the screen.' },
      { action: 'Verify the toast message text is correct and descriptive', testData: 'N/A', expectedResult: 'Toast text: "Record created successfully." Message is accurate and grammatically correct.' },
      { action: 'Verify the toast has the correct color coding: green for success', testData: 'N/A', expectedResult: 'Toast background/border is green. Success icon (✓) is displayed.' },
      { action: 'Trigger an error action to test error toast', testData: 'N/A', expectedResult: 'Red error toast appears with appropriate error message.' },
      { action: 'Trigger a warning/informational action', testData: 'N/A', expectedResult: 'Orange/yellow warning toast or blue info toast appears.' },
      { action: 'Verify the toast auto-dismisses after the configured timeout (e.g., 4 seconds)', testData: 'N/A', expectedResult: 'Toast disappears automatically after ~4 seconds without user interaction.' },
      { action: 'Click the × or close button on the toast before it auto-dismisses', testData: 'N/A', expectedResult: 'Toast dismisses immediately on close button click.' },
      { action: 'Trigger multiple actions quickly to test toast stacking', testData: 'N/A', expectedResult: 'Multiple toasts stack vertically without overlapping or obscuring each other.' },
      { action: 'Verify toast positioning does not overlap critical UI elements (buttons, forms)', testData: 'N/A', expectedResult: 'Toast appears in a corner or area that does not cover key interactive elements.' },
      { action: 'Verify toast is visible and readable on mobile viewport', testData: 'Viewport: 375px', expectedResult: 'Toast adapts to mobile. Full-width or properly constrained. Text is readable.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. SECURITY RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'SEC-001',
    category: 'security', scenarioType: 'security', priority: 'Critical', testType: 'Security',
    labels: 'security,xss,injection', estimatedTime: '20m',
    trigger: f => f.hasForms,
    title: f => `Verify XSS and SQL injection resistance on ${entityLabel(f)} input fields`,
    component: () => 'Security',
    precondition: () => 'Form with text input fields is accessible.',
    steps: (_f) => [
      { action: 'Navigate to a form with text input fields', testData: 'N/A', expectedResult: 'Form loads correctly.' },
      { action: 'Enter a basic XSS script payload into the Name field', testData: '<script>alert("XSS")</script>', expectedResult: 'Input is accepted as a string. No alert popup fires. Script is not executed.' },
      { action: 'Submit the form with the XSS payload', testData: 'N/A', expectedResult: 'Data is saved (escaped). When displayed, the raw script tag is shown as text, not executed.' },
      { action: 'Navigate back and view the saved record to verify the XSS is escaped', testData: 'N/A', expectedResult: 'Value displays as literal text "<script>alert("XSS")</script>". No script executes.' },
      { action: 'Enter an image-based XSS payload', testData: '<img src=x onerror=alert("XSS")>', expectedResult: 'Payload is treated as plain text. No alert fires. No broken image.' },
      { action: 'Enter a SQL injection payload in a search or ID field', testData: "' OR '1'='1", expectedResult: 'Query behaves normally. No unauthorized data is returned. Database is not compromised.' },
      { action: 'Enter a classic SQL drop table payload', testData: "'; DROP TABLE users;--", expectedResult: 'Payload treated as search text. No database error. Tables are unaffected.' },
      { action: 'Enter a long string of special characters in all fields', testData: "!@#$%^&*()_+<>?{}|\\][';/.,`~", expectedResult: 'App handles special characters gracefully. No 500 errors. No UI breakage.' },
      { action: 'Verify all API endpoints use parameterized queries (review with backend team if accessible)', testData: 'N/A', expectedResult: 'Backend uses prepared statements or ORMs. No raw string concatenation in DB queries.' },
      { action: 'Verify HTTP response headers include security headers (X-Content-Type-Options, CSP)', testData: 'N/A', expectedResult: 'Response headers include: X-Content-Type-Options: nosniff; Content-Security-Policy.' },
    ],
  },
  {
    id: 'SEC-002',
    category: 'security', scenarioType: 'security', priority: 'Critical', testType: 'Security',
    labels: 'security,authorization,rbac', estimatedTime: '18m',
    trigger: f => f.hasRole || f.hasAuth,
    title: () => 'Verify role-based access control and authorization boundaries',
    component: () => 'Authorization',
    precondition: () => 'Multiple user roles configured (e.g., Admin, Editor, Viewer). Test accounts for each role available.',
    steps: () => [
      { action: 'Log in as a Viewer/Read-only role user', testData: 'viewer@example.com / ViewerPass1!', expectedResult: 'Viewer logs in successfully and sees the dashboard.' },
      { action: 'Verify Viewer role cannot see "Create", "Edit", or "Delete" action buttons', testData: 'N/A', expectedResult: 'Action buttons are hidden or disabled for Viewer role.' },
      { action: 'Attempt to access the create endpoint directly via URL manipulation', testData: '/entity/create', expectedResult: 'Page is inaccessible. Redirect to 403 Forbidden or home page.' },
      { action: 'Attempt to send a direct API POST request for creation with Viewer token', testData: 'POST /api/entity with Viewer JWT', expectedResult: 'API returns 403 Forbidden. No record is created.' },
      { action: 'Log out and log in as an Editor role user', testData: 'editor@example.com / EditorPass1!', expectedResult: 'Editor logs in. Can see Create and Edit buttons but NOT Delete.' },
      { action: 'Verify Editor can create and edit but receives 403 when attempting delete via API', testData: 'DELETE /api/entity/{id} with Editor JWT', expectedResult: 'API returns 403 Forbidden. Record is not deleted.' },
      { action: 'Log in as Admin role user', testData: 'admin@example.com / AdminPass1!', expectedResult: 'Admin logs in. Has full access: Create, Edit, Delete, and Admin-only features.' },
      { action: 'Verify Admin can perform all CRUD operations successfully', testData: 'N/A', expectedResult: 'All operations succeed. No permission errors.' },
      { action: 'Attempt to access another user\'s data by manipulating IDs in the URL', testData: '/entity/999 (belonging to another user)', expectedResult: 'Access denied or own-data-only enforcement. Other user\'s data is not displayed.' },
      { action: 'Verify sensitive admin routes return 403 when accessed by non-admin tokens', testData: 'GET /api/admin/users with Editor JWT', expectedResult: 'API returns 403 Forbidden.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 12. PERFORMANCE RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'PERF-001',
    category: 'performance', scenarioType: 'performance', priority: 'High', testType: 'Performance',
    labels: 'performance,load-time', estimatedTime: '15m',
    trigger: f => f.hasDashboard || f.hasTable,
    title: f => `Verify page load performance and spinner behavior for ${entityLabel(f)}`,
    component: () => 'Performance',
    precondition: () => 'Browser DevTools Network tab is available. Test environment is stable.',
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} page and observe initial load`, testData: 'N/A', expectedResult: 'Page begins rendering within 1 second. No blank white screen lasting >2 seconds.' },
      { action: 'Verify a loading spinner/skeleton screen is shown during data fetch', testData: 'N/A', expectedResult: 'Skeleton screen or spinner appears immediately while API data loads.' },
      { action: 'Verify the spinner disappears once data has loaded', testData: 'N/A', expectedResult: 'Spinner is replaced by actual content. No spinner is stuck or looping.' },
      { action: 'Open DevTools Network tab and measure total page load time', testData: 'N/A', expectedResult: 'Total page load time is under 3 seconds on a standard connection (LCP < 2.5s).' },
      { action: 'Verify no API call takes longer than 5 seconds to respond', testData: 'N/A', expectedResult: 'All XHR/fetch requests complete in under 5 seconds. Long calls show a progress indicator.' },
      { action: 'Verify images are properly compressed and lazy-loaded where applicable', testData: 'N/A', expectedResult: 'Images below the fold have loading="lazy". File sizes are reasonable (<500KB each).' },
      { action: 'Verify no memory leaks occur after extended use (30+ minutes)', testData: 'N/A', expectedResult: 'Memory usage remains stable. No exponential growth in JavaScript heap.' },
      { action: 'Verify the page remains responsive with 1000+ records in a table', testData: '1000 records loaded', expectedResult: 'Page scrolls smoothly. Table rows render without UI freeze or jank.' },
      { action: 'Perform rapid navigation between 5 different pages', testData: 'N/A', expectedResult: 'No memory leaks from unmounted components. Navigation remains fast.' },
      { action: 'Verify the API response time is within acceptable range for large datasets', testData: 'N/A', expectedResult: 'API returns in < 2 seconds for paginated requests with up to 1000 records.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 13. ACCESSIBILITY RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'A11Y-001',
    category: 'accessibility', scenarioType: 'ui_ux', priority: 'High', testType: 'Accessibility',
    labels: 'accessibility,a11y,keyboard,aria', estimatedTime: '20m',
    trigger: () => true, // Always applicable
    title: f => `Verify keyboard navigation and ARIA accessibility for ${entityLabel(f)}`,
    component: () => 'Accessibility',
    precondition: () => 'Application is loaded in a browser. Keyboard-only navigation mode.',
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} page using keyboard only (Tab key)`, testData: 'N/A', expectedResult: 'All interactive elements are reachable via Tab. Focus order follows logical reading order.' },
      { action: 'Verify all buttons and links show a visible focus ring when focused via Tab', testData: 'N/A', expectedResult: 'Focus ring (outline) is clearly visible on all interactive elements. Not just color change.' },
      { action: 'Verify form fields can be filled using keyboard only', testData: 'N/A', expectedResult: 'All fields are reachable and editable via Tab + Enter/Space.' },
      { action: 'Verify dropdown menus can be opened and navigated using arrow keys', testData: 'N/A', expectedResult: 'Arrow keys navigate options. Enter selects. Escape closes the dropdown.' },
      { action: 'Verify all images have meaningful alt attributes', testData: 'N/A', expectedResult: 'Informative images have descriptive alt text. Decorative images have alt="" (empty).' },
      { action: 'Verify all form fields have associated <label> elements', testData: 'N/A', expectedResult: 'Each input has a linked label. Screen reader announces the field label on focus.' },
      { action: 'Verify error messages are announced to screen readers via aria-live or role="alert"', testData: 'N/A', expectedResult: 'Error messages use role="alert" or aria-live="assertive" for screen reader announcement.' },
      { action: 'Run a color contrast audit on primary text against background', testData: 'N/A', expectedResult: 'Color contrast ratio is at least 4.5:1 for normal text and 3:1 for large text (WCAG AA).' },
      { action: 'Verify interactive elements are at least 44×44px touch target size', testData: 'N/A', expectedResult: 'Buttons and links have sufficient touch target size for mobile usability.' },
      { action: 'Verify page HTML has a correct <h1> heading hierarchy', testData: 'N/A', expectedResult: 'Only one <h1> per page. Headings flow: h1 → h2 → h3 without skipping levels.' },
      { action: 'Verify skip navigation link is available for keyboard users', testData: 'N/A', expectedResult: '"Skip to main content" link is the first focusable element on the page.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. RESPONSIVE / CROSS-BROWSER RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'RESP-001',
    category: 'responsive', scenarioType: 'ui_ux', priority: 'High', testType: 'UI/UX',
    labels: 'responsive,mobile,tablet,cross-browser', estimatedTime: '20m',
    trigger: () => true, // Always applicable
    title: f => `Verify responsive design and cross-browser compatibility for ${entityLabel(f)}`,
    component: () => 'Responsive/Cross-Browser',
    precondition: () => 'Application available in Chrome, Firefox, Safari, and Edge. Mobile device or emulator available.',
    steps: f => [
      { action: `Open the ${entityLabel(f)} page in Chrome (desktop, 1920×1080)`, testData: 'Browser: Chrome, Resolution: 1920×1080', expectedResult: 'Page renders correctly. No layout breaks. All elements visible.' },
      { action: 'Verify the same page in Firefox (desktop)', testData: 'Browser: Firefox', expectedResult: 'No layout differences compared to Chrome. Fonts, spacing, and colors are consistent.' },
      { action: 'Verify the page in Safari (macOS)', testData: 'Browser: Safari', expectedResult: 'No Safari-specific rendering issues. No missing features or broken layouts.' },
      { action: 'Verify the page in Microsoft Edge', testData: 'Browser: Edge', expectedResult: 'Page renders correctly. No broken layouts or CSS issues.' },
      { action: 'Switch to mobile viewport (375px width — iPhone SE)', testData: 'DevTools: 375×667', expectedResult: 'Layout switches to single-column. Navigation collapses to hamburger menu. Text is readable.' },
      { action: 'Verify hamburger menu opens and closes correctly on mobile', testData: 'N/A', expectedResult: 'Hamburger icon toggles the mobile navigation drawer. Links are accessible.' },
      { action: 'Switch to tablet viewport (768px width — iPad)', testData: 'DevTools: 768×1024', expectedResult: 'Layout adjusts to 2-column or expanded mobile. No content overflow.' },
      { action: 'Verify touch targets are large enough on mobile (44×44px minimum)', testData: 'N/A', expectedResult: 'Buttons, links, and form fields are comfortably tappable on a touch screen.' },
      { action: 'Test landscape orientation on mobile (667×375)', testData: 'Landscape: 667×375', expectedResult: 'Layout adapts to landscape mode. No horizontal scrollbars. Content fits.' },
      { action: 'Verify no horizontal scrollbar appears at any viewport width from 320px to 1920px', testData: 'N/A', expectedResult: 'Page uses 100% width max. No overflow causes horizontal scroll on any device.' },
      { action: 'Verify images and media scale correctly across all viewports', testData: 'N/A', expectedResult: 'Images use max-width: 100%. No image overflow or pixelation on any screen size.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 15. API VALIDATION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'API-001',
    category: 'api', scenarioType: 'negative', priority: 'High', testType: 'API',
    labels: 'api,rest,validation', estimatedTime: '18m',
    trigger: f => f.hasApi || f.hasCRUD,
    title: f => `Verify API error handling and response validation for ${entityLabel(f)} endpoints`,
    component: () => 'API Layer',
    precondition: () => 'API endpoint documentation available. Test credentials available.',
    steps: f => [
      { action: `Send a valid GET request to fetch ${entityLabel(f)} list endpoint`, testData: 'GET /api/{entity}', expectedResult: 'Response: 200 OK. Body contains valid JSON array. Schema matches expected format.' },
      { action: 'Verify response headers include Content-Type: application/json', testData: 'N/A', expectedResult: 'Content-Type header is "application/json; charset=utf-8".' },
      { action: 'Send a request with an invalid/malformed ID', testData: 'GET /api/{entity}/not-a-real-id', expectedResult: 'Response: 404 Not Found or 400 Bad Request with descriptive error message.' },
      { action: 'Send a POST request with missing required fields in the body', testData: 'POST /api/{entity} with {}', expectedResult: 'Response: 400 Bad Request. Error body lists missing required fields.' },
      { action: 'Send a request with an invalid data type in the payload', testData: 'POST with "age": "not-a-number"', expectedResult: 'Response: 400 Bad Request with field validation error.' },
      { action: 'Send a request without an Authorization header/token', testData: 'No Bearer token', expectedResult: 'Response: 401 Unauthorized. Error message: "Authentication required."' },
      { action: 'Send a request with an expired/invalid JWT token', testData: 'Authorization: Bearer expiredToken', expectedResult: 'Response: 401 Unauthorized. Error: "Token expired" or "Invalid token."' },
      { action: 'Send a request from a user without sufficient permissions', testData: 'Viewer JWT token for DELETE /api/{entity}/{id}', expectedResult: 'Response: 403 Forbidden. Error message: "Insufficient permissions."' },
      { action: 'Send a request that causes a rate-limit violation', testData: '100 requests in 60 seconds', expectedResult: 'Response: 429 Too Many Requests. Retry-After header is set.' },
      { action: 'Verify the API returns consistent error format across all endpoints', testData: 'N/A', expectedResult: 'All errors follow a standard schema: { "error": "...", "message": "...", "statusCode": X }.' },
      { action: 'Verify response time is within the SLA for all key endpoints', testData: 'N/A', expectedResult: 'p95 response time is under 500ms for read operations, under 1s for write operations.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 16. DASHBOARD RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'DASH-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'dashboard,analytics,widgets', estimatedTime: '18m',
    trigger: f => f.hasDashboard,
    title: () => 'Verify dashboard widgets, metrics, and data accuracy',
    component: () => 'Dashboard',
    precondition: () => 'User is logged in. Dashboard contains data widgets and metrics.',
    steps: () => [
      { action: 'Navigate to the main Dashboard page', testData: 'N/A', expectedResult: 'Dashboard loads. All widgets begin rendering.' },
      { action: 'Verify all dashboard widgets are visible and positioned correctly', testData: 'N/A', expectedResult: 'KPI cards, charts, tables visible. Layout matches design spec.' },
      { action: 'Verify each KPI card shows a number/metric and a label', testData: 'N/A', expectedResult: 'KPI cards show values like "Total Users: 1,234" with a descriptive label.' },
      { action: 'Verify charts render with correct axis labels and data points', testData: 'N/A', expectedResult: 'Chart axes are labeled. Data points are visible and the chart is interactive (hover).' },
      { action: 'Hover over a chart data point to verify tooltip appears', testData: 'N/A', expectedResult: 'Tooltip shows date and value for the hovered data point.' },
      { action: 'Verify the date range filter updates all dashboard widgets', testData: 'Date: Last 30 Days', expectedResult: 'All widgets refresh to show data for the selected date range.' },
      { action: 'Compare a KPI metric value on the dashboard with the actual database count', testData: 'N/A', expectedResult: 'KPI value matches the actual record count in the corresponding list page.' },
      { action: 'Verify the dashboard updates in real-time or on refresh', testData: 'N/A', expectedResult: 'After page refresh, metrics reflect the latest data.' },
      { action: 'Verify loading states for widgets while data is being fetched', testData: 'N/A', expectedResult: 'Skeleton loaders appear in widget placeholders during data fetch.' },
      { action: 'Verify the dashboard layout on mobile viewport (375px)', testData: 'N/A', expectedResult: 'Widgets stack in single column on mobile. Charts resize and remain readable.' },
      { action: 'Verify the dashboard renders correctly across Chrome, Firefox, and Safari', testData: 'N/A', expectedResult: 'No layout breaks or chart rendering issues across browsers.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 17. SETTINGS / PREFERENCES RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'SETTINGS-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'Medium', testType: 'Functional',
    labels: 'settings,preferences,functional', estimatedTime: '15m',
    trigger: f => f.hasSettings,
    title: () => 'Verify settings page save, reset, and persistence behavior',
    component: () => 'Settings/Preferences',
    precondition: () => 'User is logged in and has access to the Settings page.',
    steps: () => [
      { action: 'Navigate to the Settings / Preferences page', testData: 'N/A', expectedResult: 'Settings page loads. All current user preferences are displayed.' },
      { action: 'Verify all settings fields are pre-populated with current values', testData: 'N/A', expectedResult: 'Fields show existing values, not placeholders.' },
      { action: 'Modify a profile field (e.g., display name)', testData: 'New Display Name: "Updated User"', expectedResult: 'Field accepts new value.' },
      { action: 'Toggle a preference switch (e.g., Email Notifications ON/OFF)', testData: 'N/A', expectedResult: 'Toggle switches state. Visual indicator changes.' },
      { action: 'Select a new theme or language option', testData: 'Theme: Dark Mode, Language: Spanish', expectedResult: 'Selection registers. Theme/Language preview may update instantly.' },
      { action: 'Click the "Save Changes" button', testData: 'N/A', expectedResult: 'API PATCH request sent. Success toast: "Settings saved successfully."' },
      { action: 'Verify changes persist after page refresh', testData: 'N/A', expectedResult: 'After reload, settings show the newly saved values.' },
      { action: 'Modify settings and click "Cancel" or navigate away without saving', testData: 'N/A', expectedResult: 'Original settings are restored. Unsaved changes are discarded.' },
      { action: 'Click "Reset to Defaults" button (if available)', testData: 'N/A', expectedResult: 'Confirmation dialog appears. On confirm, all settings revert to system defaults.' },
      { action: 'Verify settings changes apply immediately to the application (e.g., theme change)', testData: 'Dark mode toggle', expectedResult: 'Application UI switches to dark mode without a full page reload.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 18. WORKFLOW / APPROVAL RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'WFLOW-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'workflow,approval,status', estimatedTime: '20m',
    trigger: f => f.hasWorkflow,
    title: f => `Verify ${entityLabel(f)} workflow status transitions and approval flow`,
    component: f => `${entityLabel(f)} Workflow`,
    precondition: f => `${entityLabel(f)} in "Draft" or initial state exists. Approver account is available.`,
    steps: f => [
      { action: `Navigate to a ${entityLabel(f)} in the initial/draft state`, testData: 'N/A', expectedResult: `${entityLabel(f)} detail page shows status: "Draft".` },
      { action: 'Verify the current status is displayed prominently with correct color/badge', testData: 'N/A', expectedResult: '"Draft" status badge is visible in gray or neutral color.' },
      { action: 'Click "Submit for Approval" button', testData: 'N/A', expectedResult: 'Status transitions to "Pending Approval". Submit button is hidden/disabled.' },
      { action: 'Verify a notification is sent to the approver', testData: 'N/A', expectedResult: 'Approver receives an email or in-app notification for the pending approval.' },
      { action: 'Log in as the approver and navigate to the approval queue', testData: 'N/A', expectedResult: 'Pending item appears in the approval queue/inbox.' },
      { action: 'Click "Approve" button on the pending item', testData: 'N/A', expectedResult: 'Status transitions to "Approved". Approve button is replaced by status badge.' },
      { action: 'Verify the submitter receives a notification of approval', testData: 'N/A', expectedResult: 'Submitter gets an email/notification: "Your {entity} has been approved."' },
      { action: 'Log in as the submitter and verify the status is "Approved"', testData: 'N/A', expectedResult: 'Status badge shows "Approved" in green.' },
      { action: 'Attempt to edit an "Approved" item as a Viewer', testData: 'N/A', expectedResult: 'Edit is blocked. Approved items may be read-only for non-admins.' },
      { action: 'Test the "Reject" flow — approver rejects with a reason', testData: 'Rejection reason: "Missing required information"', expectedResult: 'Status returns to "Rejected". Reason is recorded and shown to the submitter.' },
      { action: 'Verify rejected item can be revised and resubmitted', testData: 'N/A', expectedResult: 'Submitter can edit the rejected item and resubmit. Status moves back to "Pending Approval".' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 19. IMPORT RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'IMPORT-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'import,bulk,csv', estimatedTime: '18m',
    trigger: f => f.hasImport,
    title: f => `Verify bulk import/CSV upload functionality for ${entityLabel(f)}`,
    component: f => `${entityLabel(f)} Import`,
    precondition: () => 'Import feature is accessible. Valid CSV template is available for download.',
    steps: f => [
      { action: `Navigate to the ${entityLabel(f)} Import section`, testData: 'N/A', expectedResult: 'Import page loads with upload zone and instructions.' },
      { action: 'Download the CSV template file provided', testData: 'N/A', expectedResult: 'Template CSV downloads with correct column headers.' },
      { action: 'Fill in the template with 5 valid records', testData: 'N/A', expectedResult: 'CSV prepared with correct data in all columns.' },
      { action: 'Upload the filled CSV template', testData: 'valid-import.csv (5 records)', expectedResult: 'File uploads. A preview of records is shown for user review.' },
      { action: 'Verify all 5 records are shown correctly in the preview table', testData: 'N/A', expectedResult: 'All rows and columns match the uploaded CSV data.' },
      { action: 'Click "Confirm Import" button', testData: 'N/A', expectedResult: 'Import starts. Progress indicator or percentage shown.' },
      { action: 'Verify all 5 records are created in the system', testData: 'N/A', expectedResult: 'Imported records appear in the list. Count increases by 5.' },
      { action: 'Upload a CSV with intentional errors (e.g., missing required column)', testData: 'invalid-import.csv', expectedResult: 'Error summary is shown: "Import failed. Row 3: Name is required."' },
      { action: 'Verify partial import handling — valid rows succeed, invalid rows report errors', testData: 'N/A', expectedResult: 'Valid rows imported. Errors listed for invalid rows only.' },
      { action: 'Upload a duplicate CSV (same data as first import)', testData: 'N/A', expectedResult: 'Duplicates are either rejected with a warning or merged (per business rules). No silent duplicates.' },
      { action: 'Upload an extremely large CSV (1000 rows)', testData: '1000-records.csv', expectedResult: 'Import completes successfully. Progress shown. All 1000 records created.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 20. PAYMENT RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'PAY-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'Critical', testType: 'Functional',
    labels: 'payment,checkout,billing', estimatedTime: '20m',
    trigger: f => f.hasPayment,
    title: () => 'Verify payment checkout flow with valid card details',
    component: () => 'Payment/Checkout',
    precondition: () => 'Test payment gateway is configured. Test card details available (e.g., Stripe test cards).',
    steps: () => [
      { action: 'Navigate to the checkout or payment page', testData: 'N/A', expectedResult: 'Payment form loads with order summary visible.' },
      { action: 'Verify order summary shows correct item names, quantities, and prices', testData: 'N/A', expectedResult: 'All line items are correct. Total matches sum of items + tax.' },
      { action: 'Verify the payment form shows card number, expiry, and CVV fields', testData: 'N/A', expectedResult: 'All payment fields are visible. Card number field shows card logo icons.' },
      { action: 'Enter a valid test card number', testData: '4242 4242 4242 4242 (Stripe test Visa)', expectedResult: 'Card number field accepts 16 digits with proper spacing formatting.' },
      { action: 'Enter a valid expiry date', testData: '12/26', expectedResult: 'Expiry accepts MM/YY format. Future date accepted.' },
      { action: 'Enter a valid CVV', testData: '123', expectedResult: 'CVV field accepts 3-digit code (4 for Amex). Characters are masked.' },
      { action: 'Enter billing name and address', testData: 'Test User, 123 Main St, NY 10001', expectedResult: 'All billing fields accept input.' },
      { action: 'Click "Pay Now" / "Complete Purchase" button', testData: 'N/A', expectedResult: 'Payment processing spinner appears. Button is disabled to prevent double-charge.' },
      { action: 'Verify payment success confirmation page appears', testData: 'N/A', expectedResult: 'Order confirmation page shows: "Payment successful!" with order ID and summary.' },
      { action: 'Verify confirmation email is sent to the user', testData: 'N/A', expectedResult: 'Email arrives with order details, total charged, and reference number.' },
      { action: 'Test with declined card (insufficient funds)', testData: '4000 0000 0000 9995 (Stripe declined card)', expectedResult: 'Payment fails gracefully. Error: "Your card was declined. Please try another card."' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 21. FALLBACK / GENERIC RULES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'GENERIC-001',
    category: 'functional', scenarioType: 'happy_path', priority: 'High', testType: 'Functional',
    labels: 'functional,smoke', estimatedTime: '15m',
    trigger: () => true,
    title: f => `Verify core functional flow and action sequence of ${entityLabel(f)}`,
    component: f => entityLabel(f),
    precondition: f => `${entityLabel(f)} interface is loaded and ready for interaction.`,
    steps: f => [
      { action: `Navigate to the primary ${entityLabel(f)} view or page`, testData: 'N/A', expectedResult: `${entityLabel(f)} page renders without console warnings or layout bugs.` },
      { action: 'Check that all input textboxes, select dropdowns, and button controls are visible', testData: 'N/A', expectedResult: 'All visual controls match design mockups.' },
      { action: 'Enter valid test values into all required and optional input controls', testData: 'N/A', expectedResult: 'Fields accept entries and clear validation visual flags.' },
      { action: 'Click the primary action button to process the transaction or form', testData: 'N/A', expectedResult: 'Submit triggers a loading loader spinner state and disables buttons.' },
      { action: 'Verify the successful confirmation feedback displays on completion', testData: 'N/A', expectedResult: 'Confirmation alert or success badge appears on page.' },
      { action: 'Verify saved records display accurate values matching input data', testData: 'N/A', expectedResult: 'View shows the newly entered fields saved.' }
    ]
  }
]

// ─── Matcher & Builder ────────────────────────────────────────────────────────

export function matchRules(parsed: ParsedFeature): RuleTemplate[] {
  const allMatched = RULE_CATALOG.filter(rule => rule.id !== 'GENERIC-001' && rule.trigger(parsed))

  // If specific feature scope is active, filter the matched rules by keywords in the focus area
  if (parsed.scopeOption === 'specific' && parsed.focusArea) {
    const focusWords = parsed.focusArea.toLowerCase()
      .split(/[\s,_\-\/]+/)
      .map(w => w.trim())
      .filter(w => w.length > 2)

    if (focusWords.length > 0) {
      const filtered = allMatched.filter(rule => {
        const ruleTitle = rule.title(parsed).toLowerCase()
        const ruleLabels = rule.labels.toLowerCase()
        const ruleId = rule.id.toLowerCase()
        const ruleCategory = rule.category.toLowerCase()
        
        return focusWords.some(word => 
          ruleTitle.includes(word) || 
          ruleLabels.includes(word) || 
          ruleId.includes(word) || 
          ruleCategory.includes(word)
        )
      })

      // If specific focus filtered everything out, return the generic fallback rule template
      if (filtered.length === 0) {
        const genericRule = RULE_CATALOG.find(r => r.id === 'GENERIC-001')
        return genericRule ? [genericRule] : (allMatched.length > 0 ? [allMatched[0]] : [])
      }

      return filtered
    }
  }

  // Default: return all standard matching rules (ensure fallback GENERIC-001 isn't included unless empty)
  if (allMatched.length === 0) {
    const genericRule = RULE_CATALOG.find(r => r.id === 'GENERIC-001')
    return genericRule ? [genericRule] : []
  }

  return allMatched
}

function buildSteps(rawSteps: Array<{ action: string; testData: string; expectedResult: string }>): TestStep[] {
  return rawSteps.map((s, i) => ({
    stepNumber: i + 1,
    action: s.action,
    testData: s.testData,
    expectedResult: s.expectedResult,
  }))
}

export function buildTestCases(
  rules: RuleTemplate[],
  parsed: ParsedFeature,
  startIndex = 1
): TestCase[] {
  return rules.map((rule, i) => {
    const idNum = String(startIndex + i).padStart(3, '0')
    return {
      id: `TC-${idNum}`,
      summary: rule.title(parsed),
      issueType: 'Test',
      priority: rule.priority,
      labels: rule.labels,
      testType: rule.testType,
      precondition: rule.precondition(parsed),
      steps: buildSteps(rule.steps(parsed)),
      status: 'Not Executed',
      component: rule.component(parsed),
      estimatedTime: rule.estimatedTime,
      scenarioType: rule.scenarioType,
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RulesEngineState {
  usedRuleIds: string[]
  parsed: ParsedFeature | null
}

const MAX_TOTAL_CASES = 200

class RulesEngine {
  private state: RulesEngineState = { usedRuleIds: [], parsed: null }

  /**
   * Generate the first batch of test cases from a Jira/requirement issue.
   * Resets internal state.
   */
  generate(jiraIssue: { summary: string; description: string }): TestCase[] {
    const parsed = parseRequirement(jiraIssue.summary || '', jiraIssue.description || '')
    this.state.parsed = parsed
    this.state.usedRuleIds = []

    const matchedRules = matchRules(parsed)
    const cases = buildTestCases(matchedRules, parsed, 1)

    this.state.usedRuleIds = matchedRules.map(r => r.id)
    return cases
  }

  /**
   * Generate additional test cases that were not already generated.
   * Returns { testCases, noMoreCases }.
   */
  generateMore(
    existingCases: TestCase[]
  ): { testCases: TestCase[]; noMoreCases: boolean } {
    if (!this.state.parsed) {
      return { testCases: [], noMoreCases: true }
    }

    if (existingCases.length >= MAX_TOTAL_CASES) {
      return { testCases: [], noMoreCases: true }
    }

    // Find rules not yet used — generate supplemental edge-case variations
    const allRules = RULE_CATALOG
    const unusedRules = allRules.filter(r => !this.state.usedRuleIds.includes(r.id) && r.trigger(this.state.parsed!))

    if (unusedRules.length === 0) {
      // Generate boundary/negative variations from used rules (second pass)
      const secondPassCases = this.generateSecondPassCases(existingCases)
      if (secondPassCases.length === 0) {
        return { testCases: [], noMoreCases: true }
      }
      return { testCases: secondPassCases, noMoreCases: false }
    }

    const startIndex = existingCases.length + 1
    const cases = buildTestCases(unusedRules, this.state.parsed, startIndex)
    this.state.usedRuleIds.push(...unusedRules.map(r => r.id))

    return { testCases: cases, noMoreCases: false }
  }

  /**
   * Second-pass: generate additional edge-case test cases from heuristic patterns
   * when all primary rules are exhausted.
   */
  private generateSecondPassCases(existingCases: TestCase[]): TestCase[] {
    const parsed = this.state.parsed!
    const entity = entityLabel(parsed)
    const startIdx = existingCases.length + 1

    const edgeCaseTemplates = [
      {
        title: `Verify ${entity} behavior during sudden network disconnection`,
        category: 'negative', scenarioType: 'negative', priority: 'High', testType: 'Negative',
        labels: 'network,offline,negative', estimatedTime: '15m',
        precondition: `Application is running. User is actively viewing the ${entity} view.`,
        steps: [
          { action: `Open the ${entity} view in the browser`, testData: 'N/A', expectedResult: 'View loads successfully.' },
          { action: 'Disconnect the network connection (simulate offline state in developer tools)', testData: 'Network -> Offline', expectedResult: 'Network status changes to offline.' },
          { action: 'Attempt to submit a form or trigger a state change action', testData: 'N/A', expectedResult: 'Form submission is blocked. A clear "No connection" toast warning appears.' },
          { action: 'Verify application state remains responsive and does not freeze', testData: 'N/A', expectedResult: 'UI handles offline gracefully. Controls are disabled as appropriate.' },
          { action: 'Re-enable network connection and retry the action', testData: 'Network -> Online', expectedResult: 'Network is restored. Action completes successfully.' }
        ]
      },
      {
        title: `Verify input field validation and boundary rules on ${entity} form`,
        category: 'boundary', scenarioType: 'boundary', priority: 'High', testType: 'Functional',
        labels: 'boundary,validation,forms', estimatedTime: '12m',
        precondition: `User is on the creation/edit form for ${entity}.`,
        steps: [
          { action: 'Locate primary input fields on the form', testData: 'N/A', expectedResult: 'Fields are visible and empty.' },
          { action: 'Input values matching exact maximum character limits', testData: 'Name: Max length string', expectedResult: 'Character counter shows maximum limit reached.' },
          { action: 'Try typing beyond the maximum character limit', testData: 'Extra characters', expectedResult: 'Extra characters are ignored or validation warning triggers.' },
          { action: 'Paste an extremely long string using copy-paste', testData: 'Very long pasted string', expectedResult: 'Pasted string is auto-truncated to fit maximum size limit.' },
          { action: 'Submit the form and verify data is stored correctly', testData: 'N/A', expectedResult: 'Data persists successfully without truncation errors.' }
        ]
      },
      {
        title: `Verify strict input sanitization on ${entity} text fields`,
        category: 'security', scenarioType: 'security', priority: 'Critical', testType: 'Security',
        labels: 'security,xss,sanitization', estimatedTime: '15m',
        precondition: `User is on the ${entity} input/management page.`,
        steps: [
          { action: 'Open the data submission form', testData: 'N/A', expectedResult: 'Form is active.' },
          { action: 'Enter standard XSS script payloads in text fields', testData: '<script>alert(1)</script>', expectedResult: 'Input is accepted without browser validation blocker.' },
          { action: 'Submit the form and save the record', testData: 'N/A', expectedResult: 'Record saves successfully.' },
          { action: 'Verify the saved record on details view page', testData: 'N/A', expectedResult: 'Script displays literally as text. No alert popup is executed.' }
        ]
      },
      {
        title: `Verify API rate limiting on ${entity} update and query requests`,
        category: 'performance', scenarioType: 'performance', priority: 'High', testType: 'Performance',
        labels: 'api,rate-limit,performance', estimatedTime: '15m',
        precondition: `Access credentials for ${entity} endpoints are configured.`,
        steps: [
          { action: 'Trigger a rapid burst of API requests to the endpoint', testData: '100 requests / 10 seconds', expectedResult: 'Requests are sent successfully.' },
          { action: 'Monitor HTTP status codes returned by the server', testData: 'N/A', expectedResult: 'Server begins returning HTTP 429 Too Many Requests.' },
          { action: 'Verify Retry-After response header value is present', testData: 'N/A', expectedResult: 'Retry-After header specifies delay duration.' },
          { action: 'Wait out the specified retry duration and re-test', testData: 'N/A', expectedResult: 'Requests succeed again normally.' }
        ]
      },
      {
        title: `Verify conflict resolution during concurrent modifications to same ${entity} record`,
        category: 'functional', scenarioType: 'edge_case', priority: 'High', testType: 'Functional',
        labels: 'concurrency,sync', estimatedTime: '18m',
        precondition: 'Two test sessions are open on same record ID.',
        steps: [
          { action: 'User A opens edit page for record', testData: 'N/A', expectedResult: 'Record opens in edit view.' },
          { action: 'User B opens edit page for same record in separate browser', testData: 'N/A', expectedResult: 'Record opens in edit view for User B.' },
          { action: 'User A changes status and saves', testData: 'Status: In Progress', expectedResult: 'User A changes saved.' },
          { action: 'User B edits name and attempts to save', testData: 'Name: New Version', expectedResult: 'Conflict is detected. UI displays: "This record has been updated by another session. Please reload."' }
        ]
      },
      {
        title: `Verify contrast ratios for ${entity} views in both Light and Dark theme modes`,
        category: 'accessibility', scenarioType: 'ui_ux', priority: 'Medium', testType: 'Accessibility',
        labels: 'a11y,theme,contrast', estimatedTime: '10m',
        precondition: `Application is open. Light/Dark theme switch is accessible.`,
        steps: [
          { action: 'Switch application theme to Light Mode', testData: 'N/A', expectedResult: 'Interface changes to Light style.' },
          { action: 'Check readability of all text headings and body components', testData: 'N/A', expectedResult: 'Text is legible. Contrast exceeds 4.5:1 ratio.' },
          { action: 'Toggle theme to Dark Mode', testData: 'N/A', expectedResult: 'Interface transitions cleanly to Dark style.' },
          { action: 'Verify contrast on high-priority warning badges and action buttons', testData: 'N/A', expectedResult: 'Contrast remains compliant with accessibility standards.' }
        ]
      },
      {
        title: `Verify complete keyboard navigation hierarchy on ${entity} panels`,
        category: 'accessibility', scenarioType: 'ui_ux', priority: 'Medium', testType: 'Accessibility',
        labels: 'a11y,keyboard', estimatedTime: '12m',
        precondition: 'Application dashboard is open. Mouse is disconnected.',
        steps: [
          { action: 'Press the Tab key repeatedly to navigate active controls', testData: 'N/A', expectedResult: 'Focus moves sequentially across inputs.' },
          { action: 'Verify standard keyboard controls (Enter, Space, arrow keys) work on active elements', testData: 'N/A', expectedResult: 'Click events are triggered by Enter key.' },
          { action: 'Verify focus ring is highly visible on current element', testData: 'N/A', expectedResult: 'A clear focus boundary outline is shown.' }
        ]
      },
      {
        title: `Verify ${entity} behavior when browser session cookie is manually deleted`,
        category: 'security', scenarioType: 'negative', priority: 'Critical', testType: 'Security',
        labels: 'session,cookie,logout', estimatedTime: '10m',
        precondition: 'User is authenticated.',
        steps: [
          { action: 'Navigate to the primary dashboard page', testData: 'N/A', expectedResult: 'Dashboard page loads.' },
          { action: 'Open developer console and delete active session cookies', testData: 'Console -> Application -> Cookies -> Delete', expectedResult: 'Active session cookies are removed.' },
          { action: 'Attempt to interact with any page element or refresh view', testData: 'N/A', expectedResult: 'Request fails authorization check. User is immediately redirected to login page.' }
        ]
      },
      {
        title: `Verify zoom rendering and viewport scaling up to 200% on ${entity} page`,
        category: 'responsive', scenarioType: 'ui_ux', priority: 'Medium', testType: 'UI/UX',
        labels: 'responsive,zoom,layout', estimatedTime: '10m',
        precondition: 'Application dashboard is open.',
        steps: [
          { action: 'Scale browser zoom level to 150%', testData: 'Ctrl + / Cmd +', expectedResult: 'Layout adapts cleanly. Scrollbars appear where needed.' },
          { action: 'Increase zoom level to 200%', testData: 'N/A', expectedResult: 'Font and grid scale. Elements do not overlap. Text content remains fully readable.' }
        ]
      }
    ]

    const newCases: TestCase[] = []
    let currentIdx = startIdx

    for (const temp of edgeCaseTemplates) {
      const alreadyExists = existingCases.some(c => c.summary.toLowerCase() === temp.title.toLowerCase())
      if (alreadyExists) continue

      newCases.push({
        id: `TC-${String(currentIdx).padStart(3, '0')}`,
        summary: temp.title,
        issueType: 'Test',
        priority: temp.priority as any,
        labels: temp.labels,
        testType: temp.testType,
        precondition: temp.precondition,
        scenarioType: temp.scenarioType as any,
        component: entity,
        estimatedTime: temp.estimatedTime,
        status: 'Not Executed',
        steps: buildSteps(temp.steps)
      })
      currentIdx++
    }

    const remaining = MAX_TOTAL_CASES - existingCases.length
    return newCases.slice(0, remaining)
  }
}

// Singleton export
const rulesEngine = new RulesEngine()
export default rulesEngine
