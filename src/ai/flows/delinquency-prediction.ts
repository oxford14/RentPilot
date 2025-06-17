'use server';

/**
 * @fileOverview An AI agent for predicting tenant delinquency based on payment history.
 *
 * - predictDelinquency - A function that predicts the likelihood of a tenant becoming delinquent.
 * - DelinquencyPredictionInput - The input type for the predictDelinquency function.
 * - DelinquencyPredictionOutput - The return type for the predictDelinquency function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DelinquencyPredictionInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  paymentHistory: z
    .string()
    .describe(
      'A detailed record of the tenant’s payment history, including dates, amounts, and any late payments.'
    ),
  rentalRate: z.number().describe('The monthly rental rate for the tenant.'),
  currentBalance: z
    .number()
    .describe('The current outstanding balance for the tenant.'),
});
export type DelinquencyPredictionInput = z.infer<
  typeof DelinquencyPredictionInputSchema
>;

const DelinquencyPredictionOutputSchema = z.object({
  delinquencyRisk: z
    .string()
    .describe(
      'An assessment of the likelihood of the tenant becoming delinquent (e.g., "Low", "Medium", "High").'
    ),
  riskFactors: z
    .string()
    .describe(
      'A summary of the factors contributing to the delinquency risk assessment.'
    ),
  recommendations: z
    .string()
    .describe(
      'Specific recommendations for addressing the potential delinquency, such as contacting the tenant or offering a payment plan.'
    ),
});
export type DelinquencyPredictionOutput = z.infer<
  typeof DelinquencyPredictionOutputSchema
>;

export async function predictDelinquency(
  input: DelinquencyPredictionInput
): Promise<DelinquencyPredictionOutput> {
  return predictDelinquencyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'delinquencyPredictionPrompt',
  input: {schema: DelinquencyPredictionInputSchema},
  output: {schema: DelinquencyPredictionOutputSchema},
  prompt: `You are an expert property manager specializing in predicting tenant delinquencies.

  Analyze the tenant's payment history and current balance to determine the likelihood of them becoming delinquent.

  Tenant Name: {{{tenantName}}}
  Payment History: {{{paymentHistory}}}
  Rental Rate: {{{rentalRate}}}
  Current Balance: {{{currentBalance}}}

  Based on this information, assess the delinquency risk, identify the contributing factors, and provide recommendations for addressing the potential delinquency.

  Consider factors such as late payments, partial payments, and changes in payment patterns.
  Set delinquencyRisk to "Low", "Medium", or "High".
  Provide a detailed explanation of the risk factors and specific recommendations.
  `,
});

const predictDelinquencyFlow = ai.defineFlow(
  {
    name: 'predictDelinquencyFlow',
    inputSchema: DelinquencyPredictionInputSchema,
    outputSchema: DelinquencyPredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
