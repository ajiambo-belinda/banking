'use server';

import { createSessionClient, createAdminClient } from "../appwrite";
import { ID } from "node-appwrite";
import { cookies } from "next/headers";
import { extractCustomerIdFromUrl, parseStringify } from '@/lib/utils';
import {
  CountryCode,
  Products,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum
} from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";

// 👉 ENV VARIABLES
const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

/* =========================
   SIGN IN
========================= */
export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const response = await account.createEmailPasswordSession(email, password);
    return parseStringify(response);
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  }
};

/* =========================
   SIGN UP
========================= */
export const signUp = async ({password, ...userData}: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    const { account, database } = await createAdminClient();

    // ✅ Create Appwrite Auth User
    const newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}` // ✅ fixed string interpolation
    );

    if (!newUserAccount) throw new Error('Error creating user');

    // ✅ Create Dwolla customer
    const dwollaCustomerUrl = await createDwollaCustomerUrl({
      ...userData,
      type: 'personal',
    });

    if (!dwollaCustomerUrl) {
      throw new Error('Error creating Dwolla customer');
    }

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    // ✅ Save user to database
    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    );

    // ✅ Create session
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.error('Sign-up error:', error);
    throw error;
  }
};

/* =========================
   GET LOGGED IN USER
========================= */
export async function getLoggedInUser() {
  try {
    const { account, database } = await createSessionClient();
    const user = await account.get();

    const userDoc = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!
    );

    return parseStringify(userDoc.documents.find(u => u.userId === user.$id));
  } catch {
    return null;
  }
}

/* =========================
   LOGOUT
========================= */
export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    cookies().delete("appwrite-session");
    await account.deleteSession('current');
  } catch {
    return null;
  }
};

/* =========================
   CREATE PLAID LINK TOKEN
========================= */
export const createLinkToken = async (user: User) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.$id,
      },
      client_name: `${user.firstName} ${user.lastName}`, // Fixed string interpolation
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    });

    return parseStringify({ linkToken: response.data.link_token });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/* =========================
   EXCHANGE PUBLIC TOKEN
========================= */
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account info
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create processor token
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: ProcessorTokenCreateRequestProcessorEnum.Dwolla,
    };

    const processorTokenResponse =
      await plaidClient.processorTokenCreate(request);

    const processorToken = processorTokenResponse.data.processor_token;

    // Add funding source
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    if (!fundingSourceUrl) {
      throw new Error('Failed to create funding source');
    }

    // Save bank account
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    revalidatePath('/');

    return parseStringify({ publicTokenExchange: 'complete' });
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};
