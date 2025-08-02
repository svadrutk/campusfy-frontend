import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { schoolConfigs } from '@/config/themes';
import { advisorRequestSchema, baseResponseSchema as advisorResponseSchema } from '@/lib/schemas/advisor';
import { z } from 'zod';
import { auth } from '@/auth';
import { incrementAIMetric } from '@/lib/ai-chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Get the authenticated session
    const session = await auth();
    
    // Parse and validate request body
    const body = await request.json();
    const validatedBody = advisorRequestSchema.parse(body);
    const { prompt, school } = validatedBody;

    // Get the school configuration
    const schoolConfig = schoolConfigs[school];
    if (!schoolConfig) {
      throw new Error(`Invalid school: ${school}. Available schools: ${Object.keys(schoolConfigs).join(', ')}`);
    }

    // Track metrics if user is authenticated
    if (session?.user?.email) {
      try {
        // Track message metric
        await incrementAIMetric(session.user.email, school, 'message');
      } catch (error) {
        // Log but don't fail the request if metrics tracking fails
        console.error('Failed to track AI metrics:', error);
      }
    }

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
    ${Object.entries(schoolConfig.filters.groups.reduce((acc, group) => {
      acc[group.key] = group.filters;
      return acc;
    }, {} as Record<string, string[]>)).map(([key, values]) => `"${key}": string[],  // Available values: ${values.join(', ')}`).join(',\n    ')}
    "topics": string[],  // Array of topics the student is interested in (only for subjects not covered by filters above)
    "experience": string[]  // Array of experience preferences: "Easy", "Light Workload", "Fun", "High GPA"
  },
  "followUpQuestion": string  // A natural question to ask the student to refine their search
}

CRITICAL GUIDELINES:
1. You MUST use ONLY the exact filter keys and values shown above
2. For example, if they mention a subject, use the appropriate filter from the available options instead of putting it in topics
3. Only use topics for subjects that don't match any available filters
4. Experience must be one of: "Easy", "Light Workload", "Fun", "High GPA"
5. The follow-up question should be natural and help narrow down the search
6. Return ONLY the JSON object, no other text
7. NEVER use filter keys or values that aren't explicitly listed above

Guidelines for follow-up questions:
1. Use the filter descriptions to understand what each filter means and ask relevant questions
2. If the student mentions a specific subject area, ask about their preferences within that area
3. If they mention difficulty level, ask about other aspects like workload or class size
4. If they're interested in a specific topic, ask about their preferred learning style or prerequisites
5. Keep questions concise and focused on one aspect at a time
6. Use the attribute descriptions to ask more specific questions about their preferences

Example follow-up questions based on filter descriptions:
- For quantitative courses: "Would you prefer a course that focuses on basic mathematical concepts or one that involves advanced statistical analysis?"
- For humanities courses: "Are you interested in exploring different cultural perspectives, or would you prefer to focus on a specific historical period?"
- For science courses: "Would you prefer a course with a strong laboratory component or one that's more theoretical?"
- For writing courses: "Are you looking for a course that focuses on creative writing, academic writing, or professional writing?"
- For experience preferences: "Besides difficulty level, what other aspects are important to you? For example, class size, workload, or teaching style?"

For "I want to learn about quantum physics":
{
  "filters": {
    "topics": ["quantum physics"]
  },
  "followUpQuestion": "Would you prefer a more theoretical approach to quantum physics, or one that includes practical applications and experiments?"
}`;

    // Create the user message with the prompt
    const userMessage = `Please help me find a class based on this request: "${prompt}". 
    IMPORTANT: First check if the request matches any available filters above. Only use topics for subjects that don't match available filters.
    For experience level, use the "experience" filter with one of these values:
    - "Easy" for classes that are generally easier to pass
    - "Light Workload" for classes with less demanding assignments
    - "Fun" for classes that are engaging and enjoyable
    - "High GPA" for classes where students typically earn high grades`;

    // Call OpenAI API with structured output
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Parse the response
    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('Raw AI response:', response);

    // Parse and validate the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
      console.log('Parsed response:', parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Ensure the response has the required structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('AI response is not a valid object');
    }

    // Ensure filters exist and is an object
    if (!parsedResponse.filters || typeof parsedResponse.filters !== 'object') {
      console.error('Missing or invalid filters object:', parsedResponse);
      throw new Error('AI response must include a valid filters object');
    }

    // Ensure followUpQuestion exists and is a string
    if (!parsedResponse.followUpQuestion || typeof parsedResponse.followUpQuestion !== 'string') {
      console.error('Missing or invalid followUpQuestion:', parsedResponse);
      throw new Error('AI response must include a valid followUpQuestion string');
    }

    const validatedResponse = advisorResponseSchema.parse(parsedResponse);

    // Validate that all filters are available in the school config
    const invalidFilters = Object.entries(validatedResponse.filters).filter(([key, value]) => {
      // Skip validation for topics as they are free-form
      if (key === 'topics') return false;
      
      // Skip validation for experience as it's a universal filter
      if (key === 'experience') return false;
      
      const availableOptions = availableFilters[key];
      if (!availableOptions) return true;
      
      // Handle array values
      if (Array.isArray(value)) {
        return value.some(v => !availableOptions.includes(String(v)));
      }
      
      // Handle single values
      return !availableOptions.includes(String(value));
    });

    if (invalidFilters.length > 0) {
      console.error('Invalid filters returned by AI:', invalidFilters);
      throw new Error('AI returned invalid filters');
    }

    // Validate topics format only (not values)
    const topics = validatedResponse.filters.topics;
    if (topics && !Array.isArray(topics)) {
      throw new Error('Topics filter must be an array');
    }

    // Validate experience format and values
    const experience = validatedResponse.filters.experience;
    if (experience) {
      const validExperienceValues = ["Easy", "Light Workload", "Fun", "High GPA"];
      const experienceValues = Array.isArray(experience) ? experience : [experience];
      const invalidExperience = experienceValues.filter(exp => !validExperienceValues.includes(String(exp)));
      if (invalidExperience.length > 0) {
        console.error('Invalid experience values:', invalidExperience);
        throw new Error('AI returned invalid experience values');
      }
    }

    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('Error processing AI advisor request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request or response format',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 