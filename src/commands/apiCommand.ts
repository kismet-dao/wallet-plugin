import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import { z } from 'zod';

// Core constants
const CORE_API_URL = 'http://localhost:8081';
const NETWORK_DEFAULTS = {
  SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  ETH_RPC_URL: 'https://rpc.holesky.ethpandaops.io',
  BASE_RPC_URL: 'https://mainnet.base.org'
} as const;

// Schema for API provider configuration
const APIProviderSchema = z.object({
  name: z.string(),
  envKey: z.string(),
  isSecret: z.boolean(),
  prompt: z.string(),
  default: z.string().optional(),
  validateFormat: z.function()
    .args(z.string())
    .returns(z.union([z.boolean(), z.string()]))
    .optional(),
  requiredUrl: z.string().optional()
});

// Add Grok validation function
const validateGrokKey: ValidationFunction = (value: string) => 
  value.length >= 32 || 'Grok API key should be at least 32 characters';


type APIProvider = z.infer<typeof APIProviderSchema>;

type ValidationFunction = (value: string) => boolean | string;

// Validation functions
const validateOpenAIKey: ValidationFunction = (value: string) => 
  value.startsWith('sk-') || 'OpenAI API key should start with sk-';

const validateClaudeKey: ValidationFunction = (value: string) => 
  value.startsWith('sk-ant-api') || 'Claude API key should start with sk-ant-api';

const validateCohereKey: ValidationFunction = (value: string) => 
  value.length >= 32 || 'Cohere API key should be at least 32 characters';

const validateStabilityKey: ValidationFunction = (value: string) => 
  value.startsWith('sk-') || 'Stability AI key should start with sk-';

const validateHuggingFaceKey: ValidationFunction = (value: string) => 
  value.startsWith('hf_') || 'Hugging Face API key should start with hf_';

const API_PROVIDERS: Record<string, APIProvider> = {
  // Language Models
  OPENAI: {
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    isSecret: true,
    prompt: 'Enter your OpenAI API key (starts with sk-...):',
    validateFormat: validateOpenAIKey,
    requiredUrl: 'https://api.openai.com/v1'
  },
  CLAUDE: {
    name: 'Claude',
    envKey: 'CLAUDE_API_KEY',
    isSecret: true,
    prompt: 'Enter your Claude API key (starts with sk-ant-api...):',
    validateFormat: validateClaudeKey,
    requiredUrl: 'https://api.anthropic.com'
  },
  COHERE: {
    name: 'Cohere',
    envKey: 'COHERE_API_KEY',
    isSecret: true,
    prompt: 'Enter your Cohere API key:',
    validateFormat: validateCohereKey,
    requiredUrl: 'https://api.cohere.ai/v1'
  },
  GOOGLE_AI: {
    name: 'Google AI (Gemini)',
    envKey: 'GOOGLE_AI_API_KEY',
    isSecret: true,
    prompt: 'Enter your Google AI API key:',
    requiredUrl: 'https://generativelanguage.googleapis.com/v1'
  },
  GROK: {
    name: 'Grok',
    envKey: 'XAI_API_KEY',
    isSecret: true,
    prompt: 'Enter your xAI API key:',
    validateFormat: validateGrokKey,
    requiredUrl: 'https://api.x.ai/v1'
  },
  STABILITY_AI: {
    name: 'Stability AI',
    envKey: 'STABILITY_API_KEY',
    isSecret: true,
    prompt: 'Enter your Stability AI key:',
    validateFormat: validateStabilityKey,
    requiredUrl: 'https://api.stability.ai/v1'
  },
  REPLICATE: {
    name: 'Replicate',
    envKey: 'REPLICATE_API_TOKEN',
    isSecret: true,
    prompt: 'Enter your Replicate API token:',
    requiredUrl: 'https://api.replicate.com/v1'
  },
  HUGGINGFACE: {
    name: 'Hugging Face',
    envKey: 'HUGGINGFACE_API_KEY',
    isSecret: true,
    prompt: 'Enter your Hugging Face API key (starts with hf_):',
    validateFormat: validateHuggingFaceKey,
    requiredUrl: 'https://api-inference.huggingface.co'
  },
  PINECONE: {
    name: 'Pinecone',
    envKey: 'PINECONE_API_KEY',
    isSecret: true,
    prompt: 'Enter your Pinecone API key:',
    requiredUrl: 'https://api.pinecone.io'
  },
  SERPAPI: {
    name: 'SerpAPI',
    envKey: 'SERPAPI_API_KEY',
    isSecret: true,
    prompt: 'Enter your SerpAPI key for web search:',
    requiredUrl: 'https://serpapi.com'
  },

  // Speech & Audio
  ELEVEN_LABS: {
    name: 'Eleven Labs',
    envKey: 'ELEVEN_LABS_API_KEY',
    isSecret: true,
    prompt: 'Enter your Eleven Labs API key:',
    requiredUrl: 'https://api.elevenlabs.io/v1'
  },

  // Blockchain RPCs
  SOL_RPC: {
    name: 'Solana RPC',
    envKey: 'SOLANA_RPC_URL',
    isSecret: false,
    default: NETWORK_DEFAULTS.SOLANA_RPC_URL,
    prompt: 'Enter Solana RPC URL:'
  },
  ETH_RPC: {
    name: 'Ethereum RPC',
    envKey: 'ETH_RPC_URL',
    isSecret: false,
    default: NETWORK_DEFAULTS.ETH_RPC_URL,
    prompt: 'Enter Ethereum RPC URL:'
  },
  BASE_RPC: {
    name: 'Base RPC',
    envKey: 'BASE_RPC_URL',
    isSecret: false,
    default: NETWORK_DEFAULTS.BASE_RPC_URL,
    prompt: 'Enter Base RPC URL:'
  }
};

interface APIPortalInfo {
    name: string;
    portalUrl: string;
    signupUrl?: string;
    docsUrl?: string;
    description: string;
  }
  
  const API_PORTALS: Record<string, APIPortalInfo> = {
    OPENAI: {
      name: 'OpenAI',
      portalUrl: 'https://platform.openai.com/api-keys',
      signupUrl: 'https://platform.openai.com/signup',
      docsUrl: 'https://platform.openai.com/docs/api-reference',
      description: 'Access GPT-4, GPT-3.5, and DALL·E models'
    },
    CLAUDE: {
      name: 'Anthropic Claude',
      portalUrl: 'https://console.anthropic.com/settings/keys',
      signupUrl: 'https://console.anthropic.com/signup',
      docsUrl: 'https://docs.anthropic.com',
      description: 'Access Claude 3 family of models including Opus and Sonnet'
    },
    COHERE: {
      name: 'Cohere',
      portalUrl: 'https://dashboard.cohere.com/api-keys',
      signupUrl: 'https://dashboard.cohere.com/welcome/register',
      docsUrl: 'https://docs.cohere.com',
      description: 'Specialized text generation and embeddings'
    },
    GOOGLE_AI: {
      name: 'Google AI Studio',
      portalUrl: 'https://aistudio.google.com/app/apikey',
      signupUrl: 'https://aistudio.google.com',
      docsUrl: 'https://ai.google.dev/docs',
      description: 'Access to Gemini models'
    },
    GROK: {
      name: 'Grok (xAI)',
      portalUrl: 'https://x.ai/console',
      signupUrl: 'https://x.ai/console',
      docsUrl: 'https://x.ai/docs',
      description: 'Access to Grok language models by xAI'
    },
    STABILITY_AI: {
      name: 'Stability AI',
      portalUrl: 'https://platform.stability.ai/account/keys',
      signupUrl: 'https://platform.stability.ai/sign-up',
      docsUrl: 'https://platform.stability.ai/docs/api-reference',
      description: 'Advanced image generation with Stable Diffusion models'
    },
    REPLICATE: {
      name: 'Replicate',
      portalUrl: 'https://replicate.com/account/api-tokens',
      signupUrl: 'https://replicate.com/signin',
      docsUrl: 'https://replicate.com/docs',
      description: 'Access to thousands of open-source models'
    },
    HUGGINGFACE: {
      name: 'Hugging Face',
      portalUrl: 'https://huggingface.co/settings/tokens',
      signupUrl: 'https://huggingface.co/join',
      docsUrl: 'https://huggingface.co/docs',
      description: 'Access to open-source models and Inference API'
    },
    PINECONE: {
      name: 'Pinecone',
      portalUrl: 'https://app.pinecone.io/organizations/keys',
      signupUrl: 'https://app.pinecone.io/organizations/choose-plan',
      docsUrl: 'https://docs.pinecone.io',
      description: 'Vector database for AI embeddings and similarity search'
    },
    SERPAPI: {
      name: 'SerpAPI',
      portalUrl: 'https://serpapi.com/dashboard',
      signupUrl: 'https://serpapi.com/users/sign_up',
      docsUrl: 'https://serpapi.com/docs',
      description: 'Search engine results API for web scraping'
    },
    ELEVEN_LABS: {
      name: 'Eleven Labs',
      portalUrl: 'https://elevenlabs.io/app/settings/api-keys',
      signupUrl: 'https://elevenlabs.io/sign-up',
      docsUrl: 'https://docs.elevenlabs.io',
      description: 'Advanced text-to-speech and voice cloning'
    }
  };

interface EnvConfig {
  keys: Map<string, string>;
  urls: Map<string, string>;
}

async function loadEnvFile(): Promise<EnvConfig> {
  const config: EnvConfig = {
    keys: new Map(),
    urls: new Map()
  };

  try {
    const envContent = await fs.readFile('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          const trimmedKey = key.trim();
          const trimmedValue = value.trim();
          
          if (trimmedKey.endsWith('_URL')) {
            config.urls.set(trimmedKey, trimmedValue);
          } else {
            config.keys.set(trimmedKey, trimmedValue);
          }
        }
      }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // Set core values
  config.urls.set('API_URL', CORE_API_URL);
  Object.entries(NETWORK_DEFAULTS).forEach(([key, value]) => {
    if (!config.urls.has(key)) config.urls.set(key, value);
  });

  return config;
}

async function saveEnvFile(config: EnvConfig): Promise<void> {
  const allEntries = [
    ...Array.from(config.keys.entries()),
    ...Array.from(config.urls.entries())
  ];
  
  const content = allEntries
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  await fs.writeFile('.env', content);
}


async function showAPIKeyHelp(provider: APIProvider): Promise<void> {
    const portalInfo = API_PORTALS[provider.envKey.replace('_API_KEY', '')];
    if (!portalInfo) return;
  
    console.log(chalk.blue('\n=== How to get your API key ==='));
    console.log(chalk.white(`\n${portalInfo.description}`));
    
    console.log(chalk.yellow('\nSteps to get your API key:'));
    console.log(chalk.white('1. Visit the API portal:'));
    console.log(chalk.cyan(`   ${portalInfo.portalUrl}`));
    
    if (portalInfo.signupUrl) {
      console.log(chalk.white('2. If you don\'t have an account, sign up here:'));
      console.log(chalk.cyan(`   ${portalInfo.signupUrl}`));
    }
    
    if (portalInfo.docsUrl) {
      console.log(chalk.white('\nAPI Documentation:'));
      console.log(chalk.cyan(`   ${portalInfo.docsUrl}`));
    }
    
    console.log(chalk.gray('\nNote: Some services may require payment or have usage limits.'));
    
    // Ask if user wants to open the portal in their browser
    const answer = await inquirer.prompt<{ openPortal: boolean }>([
      {
        type: 'confirm',
        name: 'openPortal',
        message: 'Would you like to open the API portal in your browser?',
        default: true
      }
    ]);
  
    if (answer.openPortal) {
      const open = (await import('open')).default;
      await open(portalInfo.portalUrl);
      console.log(chalk.green('\nOpened API portal in your browser'));
    }
  }
  

async function testApiConnection(provider: APIProvider, key: string): Promise<boolean> {
    if (!provider.requiredUrl) return true;
  
    try {
      let testUrl = provider.requiredUrl;
      let method = 'GET';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      let body: string | FormData | undefined;
  
      // Service-specific configurations
      switch (provider.name) {
        case 'Claude':
          testUrl = 'https://api.anthropic.com/v1/messages';
          method = 'POST';
          headers = {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          };
          body = JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1,
            messages: [
              { role: "user", content: "test" }
            ]
          });
          break;
  
        case 'Cohere':
          testUrl = 'https://api.cohere.ai/v1/chat';
          method = 'POST';
          headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Request-Source': 'node-sdk'
          };
          body = JSON.stringify({
            message: "test",
            model: "command",
            max_tokens: 1
          });
          break;
  
        case 'Google AI (Gemini)':
          testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`;
          method = 'POST';
          headers = {
            'Content-Type': 'application/json'
          };
          body = JSON.stringify({
            contents: [{
              parts: [{
                text: "test"
              }]
            }]
          });
          break;
          case 'Grok':
            testUrl = 'https://api.x.ai/v1/chat/completions';
            method = 'POST';
            headers = {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            };
            body = JSON.stringify({
              messages: [{
                role: "user",
                content: "test"
              }],
              model: "grok-beta",
              stream: false,
              temperature: 0,
              max_tokens: 1
            });
            break;
  
        case 'Stability AI':
          testUrl = 'https://api.stability.ai/v2beta/stable-image/generate/ultra';
          method = 'POST';
          const formData = new FormData();
          formData.append('prompt', 'test image');
          formData.append('output_format', 'webp');
          headers = {
            'Authorization': `Bearer ${key}`,
            'Accept': 'application/json'
          };
          // Remove Content-Type header for FormData
          // Browser will set it automatically with the boundary
          body = formData;
          break;
  
        case 'OpenAI':
          testUrl = 'https://api.openai.com/v1/models';
          headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          };
          break;
  
        case 'HuggingFace':
          testUrl = 'https://huggingface.co/api/models';
          headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          };
          break;
  
        case 'Replicate':
          testUrl = 'https://api.replicate.com/v1/predictions';
          method = 'POST';
          headers = {
            'Authorization': `Token ${key}`,
            'Content-Type': 'application/json'
          };
          body = JSON.stringify({
            version: "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
            input: { prompt: "test" }
          });
          break;
  
        case 'Pinecone':
          testUrl = 'https://api.pinecone.io/indexes';
          headers = {
            'Api-Key': key,
            'Content-Type': 'application/json'
          };
          break;
  
        case 'SerpAPI':
          testUrl = `https://serpapi.com/search.json?engine=google&q=test&api_key=${key}`;
          break;
  
        case 'Eleven Labs':
          testUrl = 'https://api.elevenlabs.io/v1/voices';
          headers = {
            'xi-api-key': key,
            'Content-Type': 'application/json'
          };
          break;
  
        default:
          headers = {
            'Authorization': `Bearer ${key}`
          };
      }
  
      const response = await fetch(testUrl, {
        method,
        headers,
        body
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // Special handling for different providers
        switch (provider.name) {
          case 'Stability AI':
            console.log(chalk.yellow('\nStability AI Error:'));
            if (errorData?.message) {
              console.log(chalk.gray(errorData.message));
              if (errorData.message.includes('Authorization failed') || 
                  errorData.message.includes('invalid api key')) {
                return false;
              }
              // Allow other errors (rate limits, etc)
              return true;
            }
            break;
  
          case 'Cohere':
            console.log(chalk.yellow('\nCohere API Error:'));
            if (errorData?.message) {
              console.log(chalk.gray(errorData.message));
              if (errorData.message.includes('Invalid API key')) {
                return false;
              }
              return true;
            }
            break;
  
          case 'Google AI (Gemini)':
            if (errorData?.error?.message) {
              console.log(chalk.yellow('\nGoogle AI Error:'));
              console.log(chalk.gray(errorData.error.message));
              if (errorData.error.message.includes('API key not valid')) {
                return false;
              }
              return true;
            }
            break;
  
          default:
            console.log(chalk.yellow('\nAPI Connection Error:'));
            console.log(chalk.gray(`Status: ${response.status} ${response.statusText}`));
            if (errorData) {
              console.log(chalk.gray(`Details: ${JSON.stringify(errorData, null, 2)}`));
            }
        }
        return false;
      }
  
      return true;
    } catch (error) {
      console.log(chalk.yellow('\nAPI Connection Error:'));
      console.log(chalk.gray(`Failed to connect to ${provider.name} API:`));
      console.log(chalk.gray(error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  async function validateAndTestConnection(
    provider: APIProvider,
    value: string
  ): Promise<true | string> {
    // First validate the format if there's a validator
    if (provider.validateFormat) {
      const formatResult = provider.validateFormat(value);
      if (typeof formatResult === 'string') return formatResult;
      if (!formatResult) return 'Invalid format';
    }
  
    // Then test the connection
    const connectionValid = await testApiConnection(provider, value);
    if (!connectionValid) {
      return 'API connection failed - please check your key and try again';
    }
  
    return true;
  }

  async function addApiKey(service: string): Promise<void> {
    const provider = Object.values(API_PROVIDERS).find(
      p => p.name.toLowerCase() === service.toLowerCase()
    );
  
    if (!provider) {
      console.log(chalk.red('\nUnknown service:'), service);
      console.log(chalk.yellow('Available services:'));
      Object.values(API_PROVIDERS).forEach(p => 
        console.log(chalk.white(`- ${p.name}`))
      );
      return;
    }
  
    const config = await loadEnvFile();
    const currentValue = config.keys.get(provider.envKey);
  
    const answer = await inquirer.prompt<{ value: string }>([
      {
        type: provider.isSecret ? 'password' : 'input',
        name: 'value',
        message: provider.prompt,
        default: provider.default || currentValue,
        validate: async (value: string) => {
          if (!value) return 'Value cannot be empty';
          return validateAndTestConnection(provider, value);
        }
      }
    ]);
  
    // Add debug logging
    console.log(chalk.gray('\nDebug: Adding key to config...'));
    config.keys.set(provider.envKey, answer.value);
    console.log(chalk.gray(`Debug: Key count before save: ${config.keys.size}`));
    
    await saveEnvFile(config);
    
    // Verify the save
    const newConfig = await loadEnvFile();
    console.log(chalk.gray(`Debug: Key count after save: ${newConfig.keys.size}`));
    console.log(chalk.gray(`Debug: Has ${provider.envKey}: ${newConfig.keys.has(provider.envKey)}`));
    
    console.log(chalk.green(`\n✔ ${provider.name} configuration saved successfully`));
  }

  async function configureAPIs(): Promise<void> {
    const config = await loadEnvFile();
    
    // Core API URL display
    console.log(chalk.blue('\n=== Core Configuration ==='));
    console.log(chalk.white(`Core API URL: ${chalk.cyan(CORE_API_URL)}`));
  
    // Default RPC URLs display
    console.log(chalk.blue('\n=== Default RPC Configuration ==='));
    console.log(chalk.gray('These URLs will be used if not configured:'));
    Object.entries(NETWORK_DEFAULTS).forEach(([key, value]) => {
      console.log(chalk.white(`${key.padEnd(15)}: ${chalk.cyan(value)}`));
    });
  
    const categories = {
      'Language Models': ['OPENAI', 'CLAUDE', 'COHERE', 'GOOGLE_AI', 'GROK'],
      'Image Generation': ['STABILITY_AI', 'REPLICATE'],
      'Machine Learning': ['HUGGINGFACE'],
      'Data & Search': ['PINECONE', 'SERPAPI'],
      'Speech & Audio': ['ELEVEN_LABS'],
      'Blockchain': ['SOL_RPC', 'ETH_RPC', 'BASE_RPC']
    };
    
  
    // Current Configuration Status
    console.log(chalk.blue('\n=== Current API Configuration ==='));
    
    // Display providers by category
    for (const [category, providers] of Object.entries(categories)) {
      const categoryProviders = providers
        .map(key => API_PROVIDERS[key])
        .filter(Boolean);
  
      if (categoryProviders.length > 0) {
        console.log(chalk.yellow(`\n${category}:`));
        for (const provider of categoryProviders) {
          const value = config.keys.get(provider.envKey);
          const status = value 
            ? chalk.green('✓ Configured') 
            : chalk.gray('Not configured');
          console.log(chalk.white(`  ${provider.name.padEnd(20)} ${status}`));
        }
      }
    }
  
    console.log('\n'); // Add space before interactive prompts
  
    // Interactive configuration
    let configureMore = true;
    const providers = Object.values(API_PROVIDERS);
    let currentIndex = 0;
  
    while (configureMore && currentIndex < providers.length) {
      const provider = providers[currentIndex];
      const currentValue = config.keys.get(provider.envKey);
      
      const configureAnswer = await inquirer.prompt<{ configure: boolean }>([
        {
          type: 'confirm',
          name: 'configure',
          message: `Configure ${provider.name}${currentValue ? ' (configured)' : ''}?`,
          default: !currentValue
        }
      ]);
  
      if (configureAnswer.configure) {
        // Show API key help if not configured
        if (!currentValue && API_PORTALS[provider.envKey.replace('_API_KEY', '')]) {
          await showAPIKeyHelp(provider);
        }
  
        const answer = await inquirer.prompt<{ value: string }>([
          {
            type: provider.isSecret ? 'password' : 'input',
            name: 'value',
            message: provider.prompt,
            default: provider.default || currentValue,
            validate: async (value: string) => {
              if (!value) return 'Value cannot be empty';
              return validateAndTestConnection(provider, value);
            }
          }
        ]);
  
        config.keys.set(provider.envKey, answer.value);
        await saveEnvFile(config);
        console.log(chalk.green(`\n✔ ${provider.name} key saved successfully\n`));
  
        if (currentIndex < providers.length - 1) {
          const continueAnswer = await inquirer.prompt<{ continue: boolean }>([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Configure more services?',
              default: true
            }
          ]);
          configureMore = continueAnswer.continue;
        }
      }
  
      currentIndex++;
    }
  
    // Final Configuration Status
    const finalConfig = await loadEnvFile();
    console.log(chalk.blue('\n=== Final Configuration Status ==='));
    
    for (const [category, providers] of Object.entries(categories)) {
      const categoryProviders = providers
        .map(key => API_PROVIDERS[key])
        .filter(Boolean);
  
      if (categoryProviders.length > 0) {
        console.log(chalk.yellow(`\n${category}:`));
        for (const provider of categoryProviders) {
          const value = finalConfig.keys.get(provider.envKey);
          const status = value 
            ? chalk.green('✓ Configured') 
            : chalk.gray('Not configured');
          console.log(chalk.white(`  ${provider.name.padEnd(20)} ${status}`));
        }
      }
    }
  
    console.log(chalk.green('\n✔ API configuration completed successfully'));
  
    // If there are unconfigured providers, show a helpful message
    const unconfiguredProviders = Object.values(API_PROVIDERS)
      .filter(provider => !finalConfig.keys.get(provider.envKey));
  
    if (unconfiguredProviders.length > 0) {
      console.log(chalk.yellow('\nTip: You can configure remaining services later using:'));
      console.log(chalk.white('  wallet api'));
      console.log(chalk.white('  or'));
      console.log(chalk.white('  wallet api --add <service-name>'));
      console.log(chalk.gray('\nAvailable services:'));
      unconfiguredProviders.forEach(provider => {
        console.log(chalk.gray(`  - ${provider.name}`));
      });
    }
  }


export const apiCommand = new Command('api')
  .description('Configure API endpoints and keys')
  .option('-a, --add <service>', 'Add or update API key for a service')
  .option('-l, --list', 'List available services')
  .option('-t, --test', 'Test all configured API connections')
  .action(async (options) => {
    try {
      if (options.list) {
        console.log(chalk.yellow('\nAvailable services:'));
        Object.values(API_PROVIDERS).forEach(p => 
          console.log(chalk.white(`- ${p.name}`))
        );
        return;
      }

      if (options.test) {
        const config = await loadEnvFile();
        console.log(chalk.blue('\nTesting API connections...'));
        
        for (const [key, value] of config.keys.entries()) {
          const provider = Object.values(API_PROVIDERS).find(p => p.envKey === key);
          if (provider) {
            const isValid = await testApiConnection(provider, value);
            console.log(
              isValid 
                ? chalk.green(`✔ ${provider.name}: Connection successful`)
                : chalk.red(`✘ ${provider.name}: Connection failed`)
            );
          }
        }
        return;
      }

      if (options.add) {
        await addApiKey(options.add);
      } else {
        await configureAPIs();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });