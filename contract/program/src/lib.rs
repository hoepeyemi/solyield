use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    program_error::ProgramError,
    program::{invoke, invoke_signed},
    system_instruction,
    msg,
    sysvar::{rent::Rent, Sysvar},
    borsh::try_from_slice_unchecked,
};
use spl_token::instruction as token_instruction;
use borsh::{BorshDeserialize, BorshSerialize};

/// Define the subscription account data structure
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SubscriptionAccount {
    pub is_subscribed: bool,
    pub subscription_date: u64,
    pub admin: Pubkey,
}

/// Instruction enum for the subscription program
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum SubscriptionInstruction {
    /// Pay the subscription fee (10 USDC)
    /// 0. `[signer]` The user paying for the subscription
    /// 1. `[writable]` The subscription PDA account owned by this program
    /// 2. `[writable]` The admin account that receives the fees
    /// 3. `[]` SPL Token program
    /// 4. `[writable]` User's USDC token account
    /// 5. `[writable]` Admin's USDC token account
    PaySubscription,
    
    /// Withdraw fees (admin only)
    /// 0. `[signer]` The admin withdrawing the fees
    /// 1. `[writable]` The subscription PDA account owned by this program
    /// 2. `[]` System program
    WithdrawFees {
        amount: u64,
    },
    
    /// Check if a user is subscribed
    /// 0. `[]` The user's public key
    /// 1. `[]` The subscription PDA account owned by this program
    CheckSubscription,
}

// Program entrypoint
entrypoint!(process_instruction);

// Process program instructions
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = SubscriptionInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        SubscriptionInstruction::PaySubscription => {
            process_pay_subscription(program_id, accounts)
        },
        SubscriptionInstruction::WithdrawFees { amount } => {
            process_withdraw_fees(program_id, accounts, amount)
        },
        SubscriptionInstruction::CheckSubscription => {
            process_check_subscription(program_id, accounts)
        },
    }
}

// Process subscription payment
pub fn process_pay_subscription(
    program_id: &Pubkey, 
    accounts: &[AccountInfo]
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let user_account = next_account_info(account_info_iter)?;
    let subscription_account = next_account_info(account_info_iter)?;
    let admin_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    // Verify user signed the transaction
    if !user_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify the subscription account is owned by the program
    if subscription_account.owner != program_id {
        // If account doesn't exist, create it
        let (pda, bump_seed) = Pubkey::find_program_address(
            &[b"subscription", user_account.key.as_ref()],
            program_id
        );
        
        if pda != *subscription_account.key {
            return Err(ProgramError::InvalidAccountData);
        }
        
        // Calculate the space needed for the subscription account
        let space = std::mem::size_of::<SubscriptionAccount>();
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);
        
        // Create the subscription account
        invoke_signed(
            &system_instruction::create_account(
                user_account.key,
                subscription_account.key,
                lamports,
                space as u64,
                program_id
            ),
            &[
                user_account.clone(),
                subscription_account.clone(),
                system_program.clone(),
            ],
            &[&[b"subscription", user_account.key.as_ref(), &[bump_seed]]],
        )?;
    }
    
    // Subscription fee in USDC
    // Note: USDC has 6 decimal places, so 10 USDC = 10_000_000 
    let subscription_fee: u64 = 10_000_000; // 10 USDC
    
    // Get the SPL token program and token accounts
    let token_program = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let admin_token_account = next_account_info(account_info_iter)?;
    
    // Transfer USDC tokens from user's token account to admin's token account
    invoke(
        &token_instruction::transfer(
            token_program.key,
            user_token_account.key,
            admin_token_account.key,
            user_account.key,
            &[],
            subscription_fee
        )?,
        &[
            token_program.clone(),
            user_token_account.clone(),
            admin_token_account.clone(),
            user_account.clone(),
        ],
    )?;
    
    // Update subscription account data
    let subscription_data = SubscriptionAccount {
        is_subscribed: true,
        subscription_date: solana_program::clock::Clock::get()?.unix_timestamp as u64,
        admin: *admin_account.key,
    };
    
    subscription_data.serialize(&mut &mut subscription_account.data.borrow_mut()[..])?;
    
    msg!("Subscription payment successful. User is now subscribed!");
    Ok(())
}

// Process fee withdrawal
pub fn process_withdraw_fees(
    program_id: &Pubkey, 
    accounts: &[AccountInfo],
    amount: u64
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let admin_account = next_account_info(account_info_iter)?;
    let subscription_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    // Verify admin signed the transaction
    if !admin_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify the subscription account is owned by the program
    if subscription_account.owner != program_id {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Deserialize the subscription account data
    let subscription_data = try_from_slice_unchecked::<SubscriptionAccount>(&subscription_account.data.borrow())?;
    
    // Verify the admin is the owner
    if subscription_data.admin != *admin_account.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Calculate the PDA and bump seed
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[b"subscription"],
        program_id
    );
    
    // Transfer the specified amount from the PDA to the admin
    invoke_signed(
        &system_instruction::transfer(
            subscription_account.key,
            admin_account.key,
            amount
        ),
        &[
            subscription_account.clone(),
            admin_account.clone(),
            system_program.clone(),
        ],
        &[&[b"subscription", &[bump_seed]]],
    )?;
    
    msg!("Withdrew {} lamports to admin account", amount);
    Ok(())
}

// Process check subscription status
pub fn process_check_subscription(
    program_id: &Pubkey, 
    accounts: &[AccountInfo]
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let user_account = next_account_info(account_info_iter)?;
    let subscription_account = next_account_info(account_info_iter)?;
    
    // Verify the subscription account is owned by the program
    if subscription_account.owner != program_id {
        msg!("User is not subscribed: account not owned by program");
        return Ok(());
    }
    
    // Deserialize the subscription account data
    let subscription_data = try_from_slice_unchecked::<SubscriptionAccount>(&subscription_account.data.borrow())?;
    
    // Check if the user is subscribed
    if subscription_data.is_subscribed {
        msg!("User is subscribed since {}", subscription_data.subscription_date);
    } else {
        msg!("User is not subscribed");
    }
    
    Ok(())
}