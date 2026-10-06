import config from './playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...config,testDir:'.',testMatch:'creator-provider.spec.ts'});
