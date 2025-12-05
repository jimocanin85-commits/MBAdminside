const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Mock data - skal erstattes med database queries
const mockTasks = [
  // Add mock tasks here when needed
];

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      const year = event.queryStringParameters?.year 
        ? parseInt(event.queryStringParameters.year) 
        : new Date().getFullYear();
      // TODO: Replace with actual database query
      // const tasks = await db.query('SELECT * FROM tasks WHERE EXTRACT(YEAR FROM start_dato) = $1 OR EXTRACT(YEAR FROM slut_dato) = $1', [year]);
      // For now, return mock tasks filtered by year
      const filteredTasks = mockTasks.filter((task: any) => {
        const startYear = new Date(task.start_dato).getFullYear();
        const endYear = new Date(task.slut_dato).getFullYear();
        return startYear === year || endYear === year;
      });
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(filteredTasks),
      };
    }

    if (event.httpMethod === 'POST') {
      const task = JSON.parse(event.body || '{}');
      // TODO: Replace with actual database insert
      // const newTask = await db.query('INSERT INTO tasks ...');
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ ...task, id: Date.now().toString() }),
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...updates } = body;
      // TODO: Replace with actual database update
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ id, ...updates }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      // TODO: Replace with actual database delete
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Tasks API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
