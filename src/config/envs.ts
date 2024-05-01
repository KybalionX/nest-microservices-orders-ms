import 'dotenv/config';
import * as Joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  NATS_SERVERS: string[];
}

const validationSchema = Joi.object({
  PORT: Joi.number().required(),
  DATABASE_URL: Joi.string().required(),
  NATS_SERVERS: Joi.array().items(Joi.string()).required(),
}).unknown(true);

const { error, value } = validationSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS.split(','),
});

if (error) {
  throw new Error(`Env file validation error: ${error}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  natsServers: envVars.NATS_SERVERS,
};
