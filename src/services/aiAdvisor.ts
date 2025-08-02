import { SchoolConfig } from '@/config/filterConfigs';
import OpenAI from 'openai';
import { baseResponseSchema } from '@/lib/schemas/advisor';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processAIResponse(prompt: string, schoolConfig: SchoolConfig) {
  // Get all available filter options
  const availableFilters = schoolConfig.filters.groups.reduce((acc, group) => {
    acc[group.key] = group.filters;
    return acc;
  }, {} as Record<string, string[]>);

  // Create a system message that describes the available filters
  const systemMessage = `You are an AI advisor helping students find college classes. Your task is to analyze the student's request and return appropriate filters and a follow-up question.

IMPORTANT: You MUST use ONLY the exact filter keys and values shown below. Do not use any other filter keys or values, even if they seem similar.

Available filters and their meanings:

${schoolConfig.filters.groups.map(group => `
${group.title} (key: "${group.key}"):
${group.description || 'No description available'}
Available values:
${group.filters.map(filter => `- ${filter}: ${group.attributeDescriptions?.[filter] || 'No description available'}`).join('\n')}
`).join('\n')}

Your response must be a JSON object with exactly these fields:
{
  "filters": {
    // You can use any of these filter keys with their corresponding values:
    ${Object.entries(availableFilters).map(([key, values]) => `"${key}": string[],  // Available values: ${values.join(', ')}`).join(',\n    ')}
    "topics": string[],  // Array of topics the student is interested in (only for subjects not covered by filters above)
    "experience": string[]  // Array of experience preferences: "Easy", "Light Workload", "Fun", "High GPA"
  },
  "followUpQuestion": string  // A natural question to ask the student to refine their search
}

CRITICAL GUIDELINES:
1. You MUST use ONLY the exact filter keys and values shown above
2. For example, if they mention "biological science", use the appropriate filter from the available options instead of putting it in topics
3. Only use topics for subjects that don't match any available filters
4. Experience must be one of: "Easy", "Light Workload", "Fun", "High GPA"
5. The follow-up question should be natural and help narrow down the search
6. Return ONLY the JSON object, no other text
7. NEVER use filter keys or values that aren't explicitly listed above

Example responses based on available filters:

${schoolConfig.filters.groups.map(group => {
  const example = group.filters[0];
  return `For "I want an easy ${group.title.toLowerCase()} class":
{
  "filters": {
    "${group.key}": ["${example}"],
    "experience": ["Easy"]
  },
  "followUpQuestion": "Would you prefer a class that focuses on ${group.attributeDescriptions?.[example]?.toLowerCase() || 'this subject'}?"
}`;
}).join('\n\n')}

For "I want to learn about quantum physics":
{
  "filters": {
    "topics": ["quantum physics"]
  },
  "followUpQuestion": "Would you prefer a more theoretical or experimental approach to quantum physics?"
}`;

  try {
    // Call GPT-4 API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    // Get the response content
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from GPT-4');
    }

    // Parse the response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError: unknown) {
      console.error('Failed to parse GPT-4 response as JSON:', responseContent, parseError);
      throw new Error('Invalid JSON response from GPT-4');
    }

    // Log the parsed response for debugging
    console.log('Parsed GPT-4 response:', {
      response: parsedResponse,
      availableFilters,
      school: schoolConfig.name
    });

    // Validate the response against the base schema
    const validatedResponse = baseResponseSchema.parse(parsedResponse);

    // Validate that all filters are available in the school config
    const invalidFilters = Object.entries(validatedResponse.filters).filter(([key, value]) => {
      // Skip validation for topics as they are free-form
      if (key === 'topics') return false;
      
      // Skip validation for experience as it's a universal filter
      if (key === 'experience') return false;
      
      // Check if the filter key exists in the school config
      if (!(key in availableFilters)) {
        console.error(`Invalid filter key "${key}" for school ${schoolConfig.name}. Available keys: ${Object.keys(availableFilters).join(', ')}`);
        return true;
      }
      
      const availableOptions = availableFilters[key];
      
      // Handle array values
      if (Array.isArray(value)) {
        const invalidValues = value.filter(v => !availableOptions.includes(String(v)));
        if (invalidValues.length > 0) {
          console.error(`Invalid values for filter key "${key}": ${invalidValues.join(', ')}. Available values: ${availableOptions.join(', ')}`);
        }
        return invalidValues.length > 0;
      }
      
      // Handle single values
      const isValid = availableOptions.includes(String(value));
      if (!isValid) {
        console.error(`Invalid value "${value}" for filter key "${key}". Available values: ${availableOptions.join(', ')}`);
      }
      return !isValid;
    });

    if (invalidFilters.length > 0) {
      console.error('Invalid filters returned by GPT-4:', invalidFilters);
      throw new Error('GPT-4 returned invalid filters');
    }

    return validatedResponse;
  } catch (error: unknown) {
    console.error('Error in processAIResponse:', error);
    // Return a safe fallback response
    return {
      filters: {},
      followUpQuestion: "Could you tell me more about what kind of class you're looking for?"
    };
  }
} 