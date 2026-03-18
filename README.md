# ⎇ Model Mux

[![pipeline](https://github.com/The-Nefarious-Developer/model-mux/actions/workflows/main.yaml/badge.svg)](https://github.com/The-Nefarious-Developer/model-mux/actions/workflows/main.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

**Model Mux** is a TypeScript library inspired by Python's LiteLLM, designed for the Google ADK ecosystem. It provides a unified interface to interact with multiple LLM providers _(currently OpenAI and Anthropic)_.

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
import { LlmAgent } from '@google/adk';
import { ModelMux } from 'model-mux';

const model = 'claude-opus-4-6';
const baseUrl = 'https://api.anthropic.com';
const apiKey = process.env.ANTHROPIC_API_KEY;

const modelMux = new ModelMux({ model, baseUrl, apiKey });

const agent = new LlmAgent({
  name: 'anthropic-agent',
  description: 'An agent for Anthropic Claude',
  instruction: 'Be helpful and concise.',
  model: modelMux,
});
```

> **Note:** </br>
> ModelMux also allows the usage of custom headers. Check the [ModelMuxOptions](./src/index.ts) for more details.

## Current Limitations

Model Mux currently supports standard request/response generation and streaming responses. Google ADK live connections via `connect()` are not implemented yet.

## How to Contribute

Contributions are welcome! Here's how you can get involved:

1. **Report Issues:** Found a bug or have a feature request? [Open an issue](https://github.com/The-Nefarious-Developer/model-mux/issues). <br />
2. **Submit Pull Requests:** Fork the repository, create a new branch, make your changes, and submit a PR. <br />
3. **Improve Documentation:** Help improve the README or add examples to make setup easier. <br />
4. **Test & Feedback:** Try Model Mux and provide feedback.

## License

Copyright (c) 2026 Nicholas Coutinho Checan.
Licensed under the MIT License. See [LICENSE](./LICENSE).
