import {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  type Trainer
} from '../src/integrations/database/client.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // GET /api/trainers - Get all trainers
    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters?.id;

      if (id) {
        // Get single trainer
        const trainer = await getTrainerById(Number(id));
        if (!trainer) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Trainer not found' }),
          };
        }
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, data: trainer }),
        };
      }

      // Get all trainers
      const trainers = await getAllTrainers();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: trainers }),
      };
    }

    // POST /api/trainers - Create new trainer
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const trainer = await createTrainer(body as Trainer);
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: trainer }),
      };
    }

    // PUT /api/trainers - Update trainer (id in body)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...updates } = body;
      if (!id) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Trainer ID required' }),
        };
      }

      const trainer = await updateTrainer(Number(id), updates);
      if (!trainer) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Trainer not found' }),
        };
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: trainer }),
      };
    }

    // DELETE /api/trainers - Delete trainer (id in body)
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Trainer ID required' }),
        };
      }

      await deleteTrainer(Number(id));
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Trainer deleted' }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Trainers API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
