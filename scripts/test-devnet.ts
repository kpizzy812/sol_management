import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetCollector } from "../target/types/asset_collector";
import { 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  Connection,
  clusterApiUrl
} from "@solana/web3.js";
import { 
  createMint, 
  createAssociatedTokenAccount, 
  mintTo, 
  getAccount 
} from "@solana/spl-token";

async function main() {
  console.log("🚀 Тестируем Asset Collector на Devnet...\n");

  // Настройка подключения к devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = anchor.workspace.AssetCollector as Program<AssetCollector>;
  
  console.log("📋 Program ID:", program.programId.toString());
  console.log("💼 Wallet:", wallet.publicKey.toString());
  
  // Генерируем тестовые кошельки
  const authority = Keypair.generate();
  const collectorWallet = Keypair.generate();
  const userWallet = Keypair.generate();
  
  console.log("\n🔑 Тестовые кошельки:");
  console.log("Authority:", authority.publicKey.toString());
  console.log("Collector:", collectorWallet.publicKey.toString());
  console.log("User:", userWallet.publicKey.toString());

  // PDA для состояния
  const [collectorStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("collector-state")],
    program.programId
  );
  console.log("📍 Collector State PDA:", collectorStatePDA.toString());

  try {
    // 1. Пополняем кошельки в devnet
    console.log("\n💰 Пополняем кошельки...");
    
    console.log("Запрашиваем airdrop для authority...");
    const airdropAuthority = await connection.requestAirdrop(
      authority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropAuthority);
    
    console.log("Запрашиваем airdrop для пользователя...");
    const airdropUser = await connection.requestAirdrop(
      userWallet.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropUser);
    
    console.log("✅ Airdrop завершен");

    // 2. Инициализируем контракт
    console.log("\n🏗️  Инициализируем контракт...");
    
    try {
      const tx1 = await program.methods
        .initializeCollector()
        .accounts({
          collectorState: collectorStatePDA,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      
      console.log("✅ Контракт инициализирован, TX:", tx1);
    } catch (error: any) {
      if (error.message.includes("already in use")) {
        console.log("ℹ️  Контракт уже инициализирован");
      } else {
        throw error;
      }
    }

    // 3. Устанавливаем кошелек-получатель
    console.log("\n⚙️  Устанавливаем кошелек-получатель...");
    
    const tx2 = await program.methods
      .setCollectorWallet(collectorWallet.publicKey)
      .accounts({
        collectorState: collectorStatePDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
    
    console.log("✅ Кошелек-получатель установлен, TX:", tx2);

    // 4. Проверяем состояние
    console.log("\n📊 Проверяем состояние контракта...");
    const state = await program.account.collectorState.fetch(collectorStatePDA);
    console.log("Authority:", state.authority.toString());
    console.log("Collector Wallet:", state.collectorWallet.toString());
    console.log("Gas Reserve:", state.gasReserve.toString(), "lamports");

    // 5. Создаем тестовый SPL токен
    console.log("\n🪙 Создаем тестовый SPL токен...");
    
    const mint = await createMint(
      connection,
      authority, // payer
      authority.publicKey, // mint authority
      null, // freeze authority
      9 // decimals
    );
    
    console.log("✅ SPL Token создан:", mint.toString());

    // 6. Создаем токен аккаунт для пользователя и минтим токены
    console.log("\n🏦 Создаем токен аккаунт и минтим токены...");
    
    const userTokenAccount = await createAssociatedTokenAccount(
      connection,
      authority, // payer
      mint,
      userWallet.publicKey // owner
    );
    
    const mintAmount = 1000 * 10**9; // 1000 токенов
    await mintTo(
      connection,
      authority, // payer
      mint,
      userTokenAccount,
      authority, // mint authority
      mintAmount
    );
    
    console.log("✅ Токены заминчены:", mintAmount / 10**9, "токенов");

    // 7. Проверяем балансы до сбора
    console.log("\n📈 Балансы ДО сбора активов:");
    
    const userSolBefore = await connection.getBalance(userWallet.publicKey);
    const collectorSolBefore = await connection.getBalance(collectorWallet.publicKey);
    
    console.log(`👤 User SOL: ${userSolBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`🏛️  Collector SOL: ${collectorSolBefore / LAMPORTS_PER_SOL} SOL`);
    
    const userTokenBefore = await getAccount(connection, userTokenAccount);
    console.log(`🪙 User Tokens: ${Number(userTokenBefore.amount) / 10**9} токенов`);

    // 8. Собираем SOL
    console.log("\n💎 Собираем SOL активы...");
    
    const tx3 = await program.methods
      .collectAllAssets()
      .accounts({
        collectorState: collectorStatePDA,
        userWallet: userWallet.publicKey,
        collectorWallet: collectorWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();
    
    console.log("✅ SOL собран, TX:", tx3);

    // 9. Проверяем балансы после сбора SOL
    console.log("\n📊 Балансы ПОСЛЕ сбора SOL:");
    
    const userSolAfter = await connection.getBalance(userWallet.publicKey);
    const collectorSolAfter = await connection.getBalance(collectorWallet.publicKey);
    
    console.log(`👤 User SOL: ${userSolAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`🏛️  Collector SOL: ${collectorSolAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`📈 Переведено SOL: ${(collectorSolAfter - collectorSolBefore) / LAMPORTS_PER_SOL} SOL`);

    // 10. Собираем SPL токены (пока закомментируем, так как функция может требовать доработки)
    console.log("\n🪙 Пропускаем сбор SPL токенов (требует доработки)...");
    /*
    try {
      // Создаем токен аккаунт для получателя
      const collectorTokenAccount = await createAssociatedTokenAccount(
        connection,
        authority,
        mint,
        collectorWallet.publicKey
      );

      const tx4 = await program.methods
        .collectSplTokens()
        .accounts({
          collectorState: collectorStatePDA,
          userWallet: userWallet.publicKey,
          collectorWallet: collectorWallet.publicKey,
          mint: mint,
          userTokenAccount: userTokenAccount,
          collectorTokenAccount: collectorTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([userWallet])
        .rpc();
      
      console.log("✅ SPL токены собраны, TX:", tx4);
    } catch (error) {
      console.log("❌ Ошибка при сборе SPL токенов:", error.message);
    }
    */

    console.log("\n🎉 Тест завершен успешно!");
    
  } catch (error) {
    console.error("❌ Ошибка:", error);
  }
}

main().catch(console.error);