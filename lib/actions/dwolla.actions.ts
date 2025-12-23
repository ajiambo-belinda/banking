
'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, parseStringify } from "../utils";
import { 
  CountryCode, 
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum, 
  Products 
} from "plaid";
import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { addFundingSource } from "./dwolla.actions";

const{
    APPWRITE_DATABASE_ID DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  sharebleId: z.string().min(8, "Please select a valid shareble Id"),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
};

interface DwollaFundingSource {
  _links: {
    self: { href: string };
    'funding-source': { href: string };
  };
  id: string;
  name: string;
  type: string;
  status: string;
}

export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName
}: AddFundingSourceParams): Promise<string> => {
  try {
    // Create Dwolla auth link
    const dwollaAuthLinks = await createOnDemandAuthorization();
    
    // Add funding source to the Dwolla customer & get the funding source URL
    const fundingSourceOptions: FundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };
    
    const fundingSourceUrl = await createFundingSource(fundingSourceOptions);
    
    if (!fundingSourceUrl) {
      throw new Error('Failed to create funding source');
    }
    
    return fundingSourceUrl;
  } catch (err) {
    console.error("Creating funding source failed: ", err);
    throw err;
  }
};

export const logoutAccount = async () => {  
  try {
    const { account } = await createSessionClient();
    cookies().delete('appwrite-session');
    await account.deleteSession('current');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}  

export const createLinkToken = async (user: User) => {  
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: 'Your App Name',
      products: ['auth'] as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);
    return { linkToken: response.data.link_token };
  } catch (error) {
    console.error('Error creating link token:', error);
    throw error;
  }
}  

export const createBankAccount = async ({
     userId, 
  bankId, 
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,

}; createBankAccountProps) => {
    try {
        const {database} = await createAdminClient();
        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId, 
                bankId, 
                accountId,
                accessToken,
                fundingSourceUrl,
                sharableId,
            }
        )

        return parseStringify(bankAccount)
        
    } catch (error) {
        
    }
}

export const exchangePublicToken = async ({ 
  publicToken, 
  user 
}: exchangePublicTokenProps) => { 
  try { 
    // Exchange public token for access token and item ID 
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    return { accessToken, itemId };
  } catch (error) {
    console.error('Error exchanging public token:', error);
    throw error;
  }
}

// Additional Dwolla helper functions you might need
export const createDwollaCustomer = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  type: 'personal' | 'business';
}): Promise<string> => {
  try {
    const response = await dwollaClient.post('customers', {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      type: userData.type,
    });
    
   // If the funding source URL is not created, throw an error
if (!fundingSourceUrl) throw new Error('Failed to create funding source');

// Create a bank account using the user ID, item ID, account ID, access token,
// funding source URL, and sharable ID
await createBankAccount({
  userId: user.$id,
  bankId: itemId,
  accountId: accountData.account_id,
  accessToken,
  fundingSourceUrl,
  sharableId: encryptId(accountData.account_id),
});

// Revalidate the path to reflect the changes
revalidatePath("/");