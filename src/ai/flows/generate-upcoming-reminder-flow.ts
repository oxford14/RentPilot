'use server';

/**
 * @fileOverview An AI agent for generating friendly upcoming rent reminder messages.
 *
 * - generateUpcomingDueDateReminder - A function that creates a personalized upcoming rent reminder.
 * - GenerateUpcomingDueDateReminderInput - The input type for the function.
 * - GenerateUpcomingDueDateReminderOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUpcomingDueDateReminderInputSchema = z.object({
  tenantName: z.string().describe('The first name of the tenant.'),
  dueDate: z.string().describe('The upcoming due date in a human-readable format (e.g., "July 25, 2024").'),
  landlordOrBusinessName: z.string().describe('The name of the landlord or property management business sending the reminder.'),
});
export type GenerateUpcomingDueDateReminderInput = z.infer<typeof GenerateUpcomingDueDateReminderInputSchema>;

const GenerateUpcomingDueDateReminderOutputSchema = z.object({
  reminderMessage: z
    .string()
    .describe('A concise, friendly, and professional upcoming rent reminder text message (under 160 characters).'),
});
export type GenerateUpcomingDueDateReminderOutput = z.infer<typeof GenerateUpcomingDueDateReminderOutputSchema>;

export async function generateUpcomingDueDateReminder(
  input: GenerateUpcomingDueDateReminderInput
): Promise<GenerateUpcomingDueDateReminderOutput> {
  return generateUpcomingReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUpcomingReminderPrompt',
  input: {schema: GenerateUpcomingDueDateReminderInputSchema},
  output: {schema: GenerateUpcomingDueDateReminderOutputSchema},
  prompt: `You are an assistant for a property manager. Your task is to generate a friendly, professional, and concise upcoming rent reminder message suitable for sending as an SMS text. The message must be under 160 characters.

  Tenant's Name: {{{tenantName}}}
  Upcoming Due Date: {{{dueDate}}}
  From: {{{landlordOrBusinessName}}}

  Generate a reminder message based on this information.
  Example: "Hi {{{tenantName}}}, this is a friendly reminder from {{{landlordOrBusinessName}}} that your next rent payment is due on {{{dueDate}}}. Thank you!"
  `,
});

const generateUpcomingReminderFlow = ai.defineFlow(
  {
    name: 'generateUpcomingReminderFlow',
    inputSchema: GenerateUpcomingDueDateReminderInputSchema,
    outputSchema: GenerateUpcomingDueDateReminderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
