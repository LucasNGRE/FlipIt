export async function GET(request: Request) {
    return new Response(JSON.stringify({ message: 'Test route is working!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  