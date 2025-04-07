import { Transaction } from '../types';

export const fetchBorrows = async (userAddress: string): Promise<Transaction[]> => {
  try {
    const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_THEGRAPH_API_URL || '';
    
    // Requête directe comme dans l'exemple fourni
    const query = `
    {
      borrows(
        first: 1000,
        where: { user_: { id: "${userAddress.toLowerCase()}" } },
        orderBy: timestamp,
        orderDirection: desc
      ) {
        id
        txHash
        amount
        borrowRate
        borrowRateMode
        timestamp
        reserve {
          id
        }
        user {
          id
        }
      }
    }
    `;

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors.map((e: any) => e.message).join(', '));
    }

    return json.data.borrows;
  } catch (error) {
    console.error('Error fetching borrows:', error);
    throw error;
  }
};

export const fetchSupplies = async (userAddress: string): Promise<Transaction[]> => {
  try {
    const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_THEGRAPH_API_URL || '';
    
    // Query spécifique pour les apports de liquidités (supplies)
    const query = `
    {
      supplies(
        first: 1000,
        where: {
          user_: { id: "${userAddress.toLowerCase()}" }
          reserve_in: [
            "0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70",
            "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70"
          ]
        }
        orderBy: timestamp,
        orderDirection: desc
      ) {
        id
        txHash
        amount
        timestamp
        reserve {
          id
        }
        user {
          id
        }
      }
    }
    `;

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors.map((e: any) => e.message).join(', '));
    }

    return json.data.supplies;
  } catch (error) {
    console.error('Error fetching supplies:', error);
    throw error;
  }
};

export const fetchWithdraws = async (userAddress: string): Promise<Transaction[]> => {
  try {
    const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_THEGRAPH_API_URL || '';
    
    // Utiliser redeemUnderlyings au lieu de withdraws
    const query = `
    {
      redeemUnderlyings(
        first: 1000,
        where: { user_: { id: "${userAddress.toLowerCase()}" } },
        orderBy: timestamp,
        orderDirection: desc
      ) {
        id
        txHash
        amount
        timestamp
        reserve {
          id
        }
        user {
          id
        }
      }
    }
    `;

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors.map((e: any) => e.message).join(', '));
    }

    return json.data.redeemUnderlyings;
  } catch (error) {
    console.error('Error fetching withdraws (redeemUnderlyings):', error);
    throw error;
  }
};

export const fetchRepays = async (userAddress: string): Promise<Transaction[]> => {
  try {
    const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_THEGRAPH_API_URL || '';
    
    const query = `
    {
      repays(
        first: 1000,
        where: { user_: { id: "${userAddress.toLowerCase()}" } },
        orderBy: timestamp,
        orderDirection: desc
      ) {
        id
        txHash
        amount
        timestamp
        reserve {
          id
        }
        user {
          id
        }
      }
    }
    `;

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors.map((e: any) => e.message).join(', '));
    }

    return json.data.repays;
  } catch (error) {
    console.error('Error fetching repays:', error);
    throw error;
  }
}; 