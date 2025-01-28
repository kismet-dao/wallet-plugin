#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { generateCommand } from './commands/generateCommand';
import { decryptCommand } from './commands/decryptCommand';
import { balanceCommand } from './commands/balanceCommand';
import { gasCommand } from './commands/gasCommand';
import { sendCommand } from './commands/sendCommand';
import { buyCommand } from './commands/buyCommand';
import { addressesCommand } from './commands/addressesCommand';
import { apiCommand } from './commands/apiCommand';
import { createTokenCommand } from './commands/createTokenCommand';
import { faucetCommand } from './commands/faucetCommand';
import { checkPriceCommand } from './commands/checkPriceCommand';

dotenv.config();

const program = new Command();

program
  .addCommand(generateCommand)
  .addCommand(decryptCommand)
  .addCommand(balanceCommand)
  .addCommand(gasCommand)
  .addCommand(sendCommand)
  .addCommand(buyCommand)
  .addCommand(addressesCommand)
  .addCommand(apiCommand)
  .addCommand(createTokenCommand)
  .addCommand(faucetCommand)
  .addCommand(checkPriceCommand);

program.parse(process.argv);