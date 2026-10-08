import { env } from '../config/env';

export async function indexEmail(email: any) {
  if (!env.elasticsearchUrl) return;

  try {
    await fetch(`${env.elasticsearchUrl}/emails/_doc/${email.id}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(email),
    });
  } catch (error) {
    console.error('Elasticsearch indexing error:', error);
  }
}

export async function searchEmails(query: string) {
  if (!env.elasticsearchUrl) {
    return [];
  }

  const response = await fetch(
    `${env.elasticsearchUrl}/emails/_search`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        size: 100,
        query: {
          multi_match: {
            query,
            fields: [
              'recipient',
              'sender',
              'subject',
              'body',
            ],
          },
        },
        sort: [
          {
            createdAt: {
              order: 'desc',
              unmapped_type: 'date',
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Elasticsearch search failed: ${response.status} ${response.statusText}`
    );
  }

  const data: any = await response.json();

  return (data.hits?.hits || []).map(
    (hit: any) => hit._source
  );
}