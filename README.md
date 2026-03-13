# ⎇ Model Mux

**Model Mux** is a TypeScript library inspired by Python's LiteLLM, designed for the Google ADK ecosystem. It provides a unified interface to interact with multiple LLM providers _(currently OpenAI, with Anthropic planned)_.

## Installation

```sh
npm install model-mux
```

## How to use

Getting started with Model Mux is easy! With just a few lines of code, you can connect to different LLM providers through a unified interface.

Example using **OpenAI** models:

```typescript
import { LlmAgent } from '@google/adk';
import { ModelMux } from 'model-mux';

const model = 'gpt-5.4-2026-03-05';
const baseUrl = 'https://api.openai.com/v1';
const apiKey = process.env.OPENAI_API_KEY;

const modelMux = new ModelMux({ model, baseUrl, apiKey });

const agent = new LlmAgent({
  name: 'openai-agent',
  description: 'An agent for testing purposes',
  instruction: 'When in doubt, blame the user.',
  model: modelMux,
});
```

Example using **Anthropic** models:

```typescript
...wip...
```

> **Note:** </br>
> ModelMux also allows the usage of custom headers. Check the [ModelMuxOptions](./src/index.ts) for more details.
