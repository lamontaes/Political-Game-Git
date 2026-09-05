import type { ContentBankAdapter } from "../content-bank";
import { conversationSubjectBank } from "./conversation-subjects";
import { legislativeMeasureBank } from "./legislative-blueprints";
import { legislativeRulePackBank } from "./legislative-rule-packs";
import { lifeEpisodeBank } from "./life-episodes";
import { lifeSituationBank } from "./life-situations";
import { ordinaryLifeBank } from "./ordinary-life";
import { setupQuestionnaireBank } from "./setup-questionnaire";
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
  lifeEpisodeBank,
  ordinaryLifeBank,
  conversationSubjectBank,
  setupQuestionnaireBank,
  legislativeMeasureBank,
  legislativeRulePackBank,
  productionCatalogBank,
  syntheticCatalogBank,
];

export {
  conversationSubjectBank,
  legislativeMeasureBank,
  legislativeRulePackBank,
  lifeEpisodeBank,
  lifeSituationBank,
  ordinaryLifeBank,
  setupQuestionnaireBank,
  productionCatalogBank,
  syntheticCatalogBank,
};
