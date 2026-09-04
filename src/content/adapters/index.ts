import type { ContentBankAdapter } from "../content-bank";
import { conversationSubjectBank } from "./conversation-subjects";
import { legislativeMeasureBank } from "./legislative-blueprints";
import { legislativeRulePackBank } from "./legislative-rule-packs";
import { lifeSituationBank } from "./life-situations";
import { ordinaryLifeBank } from "./ordinary-life";
import {
  productionCatalogBank,
  syntheticCatalogBank,
} from "./simulation-catalogs";

/**
 * Every bank the repository currently has an adapter for.
 *
 * Registration is a list, on purpose. A bank arriving later — from legislative
 * bargaining, from a wider content pass, from anywhere — is one adapter and one
 * line here, and nothing about the contract or the browser has to change to
 * accommodate it.
 */
export const DEFAULT_CONTENT_BANK_ADAPTERS: readonly ContentBankAdapter[] = [
  lifeSituationBank,
  ordinaryLifeBank,
  conversationSubjectBank,
  legislativeMeasureBank,
  legislativeRulePackBank,
  productionCatalogBank,
  syntheticCatalogBank,
];

export {
  conversationSubjectBank,
  legislativeMeasureBank,
  legislativeRulePackBank,
  lifeSituationBank,
  ordinaryLifeBank,
  productionCatalogBank,
  syntheticCatalogBank,
};
