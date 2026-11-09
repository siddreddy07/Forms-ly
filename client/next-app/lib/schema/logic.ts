import type { Answers, AnswerValue, Block, ConditionGroup, FormDocument, LeafCondition } from "./types"

function isEmpty(v: AnswerValue) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
}

function evaluateLeaf(leaf: LeafCondition, answers: Answers): boolean {
  const actual = answers[leaf.blockId]
  switch (leaf.operator) {
    case "is_empty":
      return isEmpty(actual)
    case "is_not_empty":
      return !isEmpty(actual)
    case "equals":
      return Array.isArray(actual) ? actual.length === 1 && actual[0] === leaf.value : actual === leaf.value
    case "not_equals":
      return Array.isArray(actual) ? !(actual.length === 1 && actual[0] === leaf.value) : actual !== leaf.value
    case "contains":
      return Array.isArray(actual)
        ? (actual as unknown[]).includes(leaf.value)
        : typeof actual === "string" && typeof leaf.value === "string" && actual.toLowerCase().includes(leaf.value.toLowerCase())
    case "greater_than":
      return typeof actual === "number" && typeof leaf.value === "number" && actual > leaf.value
    case "less_than":
      return typeof actual === "number" && typeof leaf.value === "number" && actual < leaf.value
  }
}

export function evaluateGroup(group: ConditionGroup, answers: Answers): boolean {
  const results = group.conditions.map((c) => evaluateLeaf(c, answers))
  return group.match === "all" ? results.every(Boolean) : results.some(Boolean)
}

/* A block is visible unless a "hide" rule matches, or it has "show" rules and none match. */
export function isBlockVisible(block: Block, answers: Answers): boolean {
  const rules = block.logic ?? []
  if (rules.length === 0) return true
  if (rules.some((r) => r.action === "hide" && evaluateGroup(r.when, answers))) return false
  const showRules = rules.filter((r) => r.action === "show")
  return showRules.length === 0 || showRules.some((r) => evaluateGroup(r.when, answers))
}

export function visibleBlocks(form: FormDocument, answers: Answers): Block[] {
  return form.steps.flatMap((s) => s.blocks).filter((b) => isBlockVisible(b, answers))
}

/* Rules that point at a block that no longer exists, or at themselves. */
export function findBrokenRules(form: FormDocument) {
  const ids = new Set(form.steps.flatMap((s) => s.blocks.map((b) => b.id)))
  const broken: { blockId: string; ruleId: string; reason: string }[] = []
  for (const step of form.steps) {
    for (const block of step.blocks) {
      for (const rule of block.logic ?? []) {
        for (const c of rule.when.conditions) {
          if (!ids.has(c.blockId)) broken.push({ blockId: block.id, ruleId: rule.id, reason: "Refers to a deleted field" })
          else if (c.blockId === block.id) broken.push({ blockId: block.id, ruleId: rule.id, reason: "Refers to itself" })
        }
      }
    }
  }
  return broken
}