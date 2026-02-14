import { getAuthToken, validateSession } from '../../middleware';
import { getDocument } from '../../firestore';
import { Transaction } from '../../../types';

export async function handleTransactions(request: Request) {
  const token = getAuthToken(request);

  if (!token) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = await validateSession(token);

  if (!user) {
    return Response.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Parse query parameters
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Validate limit
  if (limit < 1 || limit > 100) {
    return Response.json(
      { error: 'Limit must be between 1 and 100' },
      { status: 400 }
    );
  }

  // Fetch user transactions
  const allTransactions = await getDocument('transactions', { UserId: user.Id }) as Transaction[];

  // Sort by CreatedAt descending (newest first)
  const sortedTransactions = allTransactions.sort((a, b) => {
    const dateA = a.CreatedAt?.toDate?.() || new Date(a.CreatedAt);
    const dateB = b.CreatedAt?.toDate?.() || new Date(b.CreatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Apply pagination
  const paginatedTransactions = sortedTransactions.slice(offset, offset + limit);

  return Response.json({
    transactions: paginatedTransactions,
    total: allTransactions.length,
    limit,
    offset,
    hasMore: offset + limit < allTransactions.length,
  });
}