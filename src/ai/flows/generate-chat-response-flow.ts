'use server';
/**
 * @fileOverview An AI agent for generating chat response options for an admin.
 *
 * - generateChatResponseOptions - A function that suggests multiple replies.
 * - GenerateChatResponseOptionsInput - The input type for the function.
 * - GenerateChatResponseOptionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ChatMessageSchema = z.object({
  sender: z.enum(['admin', 'visitor']),
  text: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const GenerateChatResponseOptionsInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The conversation history so far.'),
});
export type GenerateChatResponseOptionsInput = z.infer<
  typeof GenerateChatResponseOptionsInputSchema
>;

const GenerateChatResponseOptionsOutputSchema = z.object({
  options: z
    .array(z.string().describe('A potential response to the visitor.'))
    .length(3)
    .describe('An array of exactly 3 response options.'),
});
export type GenerateChatResponseOptionsOutput = z.infer<
  typeof GenerateChatResponseOptionsOutputSchema
>;

export async function generateChatResponseOptions(
  input: GenerateChatResponseOptionsInput
): Promise<GenerateChatResponseOptionsOutput> {
  return generateResponseOptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChatResponseOptionsPrompt',
  input: {schema: GenerateChatResponseOptionsInputSchema},
  output: {schema: GenerateChatResponseOptionsOutputSchema},
  prompt: `You are a helpful and professional customer support agent for a rental management application called "RentPilot".

  Your key features include:
  - Tenant Management: Add/edit tenant profiles, manage status, and set rental rates.
  - Payment Tracking: Record and track payments with dates, amounts, and methods.
  - Report Generation: Create financial reports for specific time ranges.
  - Delinquency Prediction: An AI tool to analyze payment patterns and predict overdue accounts.
  - Business Tracking: A feature for landlords to track income and expense allocations for different businesses they manage.

  Analyze the following conversation history, paying close attention to the last message from the visitor.
  Based on the visitor's query, generate exactly three distinct, concise, and friendly response options for the admin to use.
  The responses should be helpful and directly address the visitor's question or comment.

  Conversation History:
  {{#each history}}
  {{sender}}: {{text}}
  {{/each}}
  `,
});

const generateResponseOptionsFlow = ai.defineFlow(
  {
    name: 'generateResponseOptionsFlow',
    inputSchema: GenerateChatResponseOptionsInputSchema,
    outputSchema: GenerateChatResponseOptionsOutputSchema,
  },
  async input => {
    // Ensure there is at least one message from the visitor to respond to.
    if (!input.history.some(m => m.sender === 'visitor')) {
      return { options: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
