'use server';

/**
 * @fileOverview An AI agent for generating friendly rent reminder messages.
 *
 * - generateReminder - A function that creates a personalized rent reminder message.
 * - GenerateReminderInput - The input type for the generateReminder function.
 * - GenerateReminderOutput - The return type for the generateReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReminderInputSchema = z.object({
  tenantName: z.string().describe('The first name of the tenant.'),
  amountDue: z.number().describe('The total amount of rent currently due.'),
  landlordOrBusinessName: z.string().describe('The name of the landlord or property management business sending the reminder.'),
});
export type GenerateReminderInput = z.infer<typeof GenerateReminderInputSchema>;

const GenerateReminderOutputSchema = z.object({
  reminderMessage: z
    .string()
    .describe('A concise, friendly, and professional rent reminder text message (under 160 characters).'),
});
export type GenerateReminderOutput = z.infer<typeof GenerateReminderOutputSchema>;

export async function generateReminder(
  input: GenerateReminderInput
): Promise<GenerateReminderOutput> {
  return generateReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReminderPrompt',
  input: {schema: GenerateReminderInputSchema},
  output: {schema: GenerateReminderOutputSchema},
  prompt: `You are an assistant for a property manager. Your task is to generate a friendly, professional, and concise rent reminder message suitable for sending as an SMS text. The message must be under 160 characters.

  Tenant's Name: {{{tenantName}}}
  Amount Due: ₱{{{amountDue}}}
  From: {{{landlordOrBusinessName}}}

  Generate a reminder message based on this information.
  Example: "Hi {{{tenantName}}}, just a friendly reminder from {{{landlordOrBusinessName}}} that your rent payment of ₱{{{amountDue}}} is due. Please let us know if you have any questions. Thank you!"
  `,
});

const generateReminderFlow = ai.defineFlow(
  {
    name: 'generateReminderFlow',
    inputSchema: GenerateReminderInputSchema,
    outputSchema: GenerateReminderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
