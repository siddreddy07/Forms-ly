import type { Block, BlockType } from "./types"

/* One entry per block type. Icons and editor panels live in the UI layer and key off `type`. */

export type BlockGroup = "text" | "choice" | "rating" | "other" | "layout"

export type BlockDefinition = {
  type: BlockType
  label: string
  description: string
  group: BlockGroup
  /* Layout blocks display content and collect no answer. */
  collectsAnswer: boolean
  /* Defaults applied when a block is first dropped on the canvas. */
  defaults: () => Partial<Block>
}

const choiceOptions = () => [
  { id: "opt_1", label: "Option 1" },
  { id: "opt_2", label: "Option 2" },
  { id: "opt_3", label: "Option 3" },
]

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  short_text: { type: "short_text", label: "Short text", description: "Names, titles, one-line answers", group: "text", collectsAnswer: true, defaults: () => ({ label: "Short text", validation: { maxLength: 200 } }) },
  long_text: { type: "long_text", label: "Long text", description: "Paragraphs and open answers", group: "text", collectsAnswer: true, defaults: () => ({ label: "Long text", validation: { maxLength: 2000 } }) },
  email: { type: "email", label: "Email", description: "Checked for a valid address", group: "text", collectsAnswer: true, defaults: () => ({ label: "Email address", placeholder: "name@example.com" }) },
  phone: { type: "phone", label: "Phone", description: "Phone number", group: "text", collectsAnswer: true, defaults: () => ({ label: "Phone number" }) },
  number: { type: "number", label: "Number", description: "Quantities, ages, amounts", group: "text", collectsAnswer: true, defaults: () => ({ label: "Number" }) },
  url: { type: "url", label: "Website", description: "A link, checked for format", group: "text", collectsAnswer: true, defaults: () => ({ label: "Website", placeholder: "https://" }) },
  date: { type: "date", label: "Date", description: "Pick a day", group: "text", collectsAnswer: true, defaults: () => ({ label: "Date" }) },
  time: { type: "time", label: "Time", description: "Pick a time", group: "text", collectsAnswer: true, defaults: () => ({ label: "Time" }) },
  single_choice: { type: "single_choice", label: "Single choice", description: "Pick one option", group: "choice", collectsAnswer: true, defaults: () => ({ label: "Pick one", options: choiceOptions() }) },
  multiple_choice: { type: "multiple_choice", label: "Multiple choice", description: "Pick any that apply", group: "choice", collectsAnswer: true, defaults: () => ({ label: "Pick all that apply", options: choiceOptions() }) },
  dropdown: { type: "dropdown", label: "Dropdown", description: "Pick one from a long list", group: "choice", collectsAnswer: true, defaults: () => ({ label: "Choose", options: choiceOptions() }) },
  yes_no: { type: "yes_no", label: "Yes or no", description: "A simple two-way question", group: "choice", collectsAnswer: true, defaults: () => ({ label: "Yes or no?" }) },
  rating: { type: "rating", label: "Rating", description: "One to five stars", group: "rating", collectsAnswer: true, defaults: () => ({ label: "How would you rate it?", scale: { min: 1, max: 5 } }) },
  scale: { type: "scale", label: "Scale", description: "A numbered range, such as 0 to 10", group: "rating", collectsAnswer: true, defaults: () => ({ label: "How likely are you to recommend us?", scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" } }) },
  file_upload: { type: "file_upload", label: "File upload", description: "CVs, images, documents", group: "other", collectsAnswer: true, defaults: () => ({ label: "Upload a file", validation: { maxFiles: 1, maxFileSizeMb: 3 } }) },
  heading: { type: "heading", label: "Heading", description: "A title between questions", group: "layout", collectsAnswer: false, defaults: () => ({ label: "", content: "Section title" }) },
  paragraph: { type: "paragraph", label: "Paragraph", description: "Explanatory text", group: "layout", collectsAnswer: false, defaults: () => ({ label: "", content: "Add some text here." }) },
  divider: { type: "divider", label: "Divider", description: "A line to separate sections", group: "layout", collectsAnswer: false, defaults: () => ({ label: "" }) },
  image: { type: "image", label: "Image", description: "A picture or logo", group: "layout", collectsAnswer: false, defaults: () => ({ label: "", content: "", alt: "" }) },
}

export const blockGroups: { id: BlockGroup; label: string }[] = [
  { id: "text", label: "Text and details" },
  { id: "choice", label: "Choices" },
  { id: "rating", label: "Ratings" },
  { id: "other", label: "Files" },
  { id: "layout", label: "Layout" },
]

export function isAnswerBlock(type: BlockType) {
  return blockRegistry[type].collectsAnswer
}

/* Form-design research (Baymard, NN/g, GOV.UK) agrees on one column by default: side-by-side fields
   are skipped more often and read in the wrong order. Names, emails, phone numbers and links stay
   full width. Only short, naturally paired values may share a row: date + time, quantity + yes/no,
   or two short dropdowns. Everything else (long text, option cards, scales, uploads, layout) is full. */
const sharesRow = new Set<BlockType>(["number", "date", "time", "dropdown", "yes_no"])

export function supportsWidth(type: BlockType) {
  return sharesRow.has(type)
}
