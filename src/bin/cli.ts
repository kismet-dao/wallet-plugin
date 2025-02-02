#!/usr/bin/env node
// src/bin/cli.ts

import { Command } from 'commander';
import dotenv from 'dotenv';
import {
  addressesCommand,
  apiCommand,
  balanceCommand,
  buyCommand,
  checkPriceCommand,
  createDAOCommand,
  createTokenCommand,
  decryptCommand,
  faucetCommand,
  gasCommand,
  generateCommand,
  sendCommand,
  XRPTestnetCommand
} from '../commands';

dotenv.config();

const program = new Command();

program
  .addCommand(addressesCommand)
  .addCommand(apiCommand)
  .addCommand(balanceCommand)
  .addCommand(buyCommand)
  .addCommand(checkPriceCommand)
  .addCommand(createDAOCommand)
  .addCommand(createTokenCommand)
  .addCommand(decryptCommand)
  .addCommand(faucetCommand)
  .addCommand(gasCommand)
  .addCommand(generateCommand)
  .addCommand(sendCommand)
  .addCommand(XRPTestnetCommand);

program.parse(process.argv);