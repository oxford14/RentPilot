
'use server';

/**
 * @fileOverview An AI agent for generating a personalized contract from a template.
 *
 * - generateContract - A function that creates a personalized contract.
 * - GenerateContractInput - The input type for the generateContract function.
 * - GenerateContractOutput - The return type for the generateContract function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContractInputSchema = z.object({
  templateBody: z.string().describe('The contract template with Handlebars placeholders.'),
  tenant_name: z.string().describe("The full name of the tenant."),
  monthly_rate: z.number().describe("The tenant's monthly rental rate."),
  security_deposit: z.number().describe("The security deposit amount paid by the tenant."),
  join_date: z.string().describe("The tenant's official join date in a readable format (e.g., 'July 1, 2024')."),
});
export type GenerateContractInput = z.infer<typeof GenerateContractInputSchema>;

const GenerateContractOutputSchema = z.object({
  finalContract: z
    .string()
    .describe('The final, fully-rendered contract text with all placeholders filled in.'),
});
export type GenerateContractOutput = z.infer<typeof GenerateContractOutputSchema>;

export async function generateContract(
  input: GenerateContractInput
): Promise<GenerateContractOutput> {
  return generateContractFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContractPrompt',
  input: {schema: GenerateContractInputSchema},
  output: {schema: GenerateContractOutputSchema},
  prompt: `You are an assistant that generates a legal contract by filling in a template.
  
  Carefully replace the Handlebars placeholders in the following template with the provided data.
  Ensure the final output is only the contract text, with no additional commentary.

  Template:
  {{{templateBody}}}

  Data:
  - Tenant Name: {{{tenant_name}}}
  - Monthly Rent: ₱{{{monthly_rate}}}
  - Security Deposit: ₱{{{security_deposit}}}
  - Join Date: {{{join_date}}}
  `,
});

const generateContractFlow = ai.defineFlow(
  {
    name: 'generateContractFlow',
    inputSchema: GenerateContractInputSchema,
    outputSchema: GenerateContractOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
