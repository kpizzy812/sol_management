import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("asset-collector", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.assetCollector;
  
  // Test keypairs
  const authority = Keypair.generate();
  const collectorWallet = Keypair.generate();
  const userWallet = Keypair.generate();
  
  // PDA для состояния
  const [collectorStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("collector-state")],
    program.programId
  );

  // SPL Token variables
  let testMint: PublicKey;
  let userTokenAccount: PublicKey;
  let collectorTokenAccount: PublicKey;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Basic initialization signature:", tx);
  });

  it("Airdrop SOL to test accounts", async () => {
    // Пополняем тестовые аккаунты
    const airdropAuthority = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    
    const airdropUser = await provider.connection.requestAirdrop(
      userWallet.publicKey,
      1 * LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(airdropAuthority);
    await provider.connection.confirmTransaction(airdropUser);
    
    console.log("✅ Airdrop completed");
  });

  it("Initialize collector state", async () => {
    const tx = await program.methods
      .initializeCollector()
      .accounts({
        collectorState: collectorStatePDA,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
      
    console.log("Initialize collector signature:", tx);
    
    // Проверяем состояние
    const state = await program.account.collectorState.fetch(collectorStatePDA);
    expect(state.authority.toString()).to.equal(authority.publicKey.toString());
    expect(state.gasReserve.toString()).to.equal("15000000"); // 0.015 SOL
    console.log("✅ Collector state initialized correctly");
  });

  it("Set collector wallet", async () => {
    const tx = await program.methods
      .setCollectorWallet(collectorWallet.publicKey)
      .accounts({
        collectorState: collectorStatePDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
      
    console.log("Set collector wallet signature:", tx);
    
    // Проверяем состояние
    const state = await program.account.collectorState.fetch(collectorStatePDA);
    expect(state.collectorWallet.toString()).to.equal(collectorWallet.publicKey.toString());
    console.log("✅ Collector wallet set correctly");
  });

  it("Should fail to set collector wallet with wrong authority", async () => {
    const wrongAuthority = Keypair.generate();
    
    try {
      await program.methods
        .setCollectorWallet(collectorWallet.publicKey)
        .accounts({
          collectorState: collectorStatePDA,
          authority: wrongAuthority.publicKey,
        })
        .signers([wrongAuthority])
        .rpc();
        
      expect.fail("Expected transaction to fail");
    } catch (error: any) {
      expect(error.message).to.include("unauthorized");
      console.log("✅ Correctly rejected wrong authority");
    }
  });

  it("Create test SPL token and mint to user", async () => {
    console.log("🪙 Creating test SPL token...");
    
    // Создаем mint
    testMint = await createMint(
      provider.connection,
      authority, // payer
      authority.publicKey, // mint authority
      null, // freeze authority
      9 // decimals
    );
    
    console.log("Test mint address:", testMint.toString());

    // Создаем токен аккаунт для пользователя
    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      authority, // payer
      testMint,
      userWallet.publicKey
    );
    
    console.log("User token account:", userTokenAccount.toString());

    // Минтим токены пользователю
    const mintAmount = 1000 * 10**9; // 1000 токенов
    await mintTo(
      provider.connection,
      authority, // payer
      testMint,
      userTokenAccount,
      authority, // mint authority
      mintAmount
    );

    // Проверяем баланс
    const userTokenInfo = await getAccount(provider.connection, userTokenAccount);
    expect(Number(userTokenInfo.amount)).to.equal(mintAmount);
    
    console.log(`✅ Minted ${Number(userTokenInfo.amount) / 10**9} tokens to user`);
  });

  it("Create collector token account", async () => {
    // Создаем токен аккаунт для получателя
    collectorTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      authority, // payer
      testMint,
      collectorWallet.publicKey
    );
    
    console.log("Collector token account:", collectorTokenAccount.toString());
    
    // Проверяем, что баланс пустой
    const collectorTokenInfo = await getAccount(provider.connection, collectorTokenAccount);
    expect(Number(collectorTokenInfo.amount)).to.equal(0);
    
    console.log("✅ Collector token account created with 0 balance");
  });

  it("Collect SOL assets from user wallet", async () => {
    // Получаем баланс до операции
    const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
    const collectorBalanceBefore = await provider.connection.getBalance(collectorWallet.publicKey);
    
    console.log(`User SOL before: ${userBalanceBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`Collector SOL before: ${collectorBalanceBefore / LAMPORTS_PER_SOL} SOL`);
    
    const tx = await program.methods
      .collectAllAssets()
      .accounts({
        collectorState: collectorStatePDA,
        userWallet: userWallet.publicKey,
        collectorWallet: collectorWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();
      
    console.log("Collect SOL assets signature:", tx);
    
    // Получаем баланс после операции
    const userBalanceAfter = await provider.connection.getBalance(userWallet.publicKey);
    const collectorBalanceAfter = await provider.connection.getBalance(collectorWallet.publicKey);
    
    console.log(`User SOL after: ${userBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`Collector SOL after: ${collectorBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    
    // Проверяем, что у пользователя остался резерв (~0.015 SOL + немного на комиссии)
    expect(userBalanceAfter).to.be.lessThan(userBalanceBefore);
    expect(userBalanceAfter).to.be.greaterThan(10_000_000); // больше 0.01 SOL (резерв минус комиссии)
    
    // Проверяем, что коллектор получил средства
    expect(collectorBalanceAfter).to.be.greaterThan(collectorBalanceBefore);
    
    const transferredAmount = (collectorBalanceAfter - collectorBalanceBefore) / LAMPORTS_PER_SOL;
    console.log(`✅ SOL transferred: ${transferredAmount} SOL`);
  });

  it("Collect SPL tokens from user wallet", async () => {
    // Получаем баланс токенов до операции
    const userTokenBefore = await getAccount(provider.connection, userTokenAccount);
    const collectorTokenBefore = await getAccount(provider.connection, collectorTokenAccount);
    
    console.log(`User tokens before: ${Number(userTokenBefore.amount) / 10**9}`);
    console.log(`Collector tokens before: ${Number(collectorTokenBefore.amount) / 10**9}`);
    
    const tx = await program.methods
      .collectSplTokens()
      .accounts({
        collectorState: collectorStatePDA,
        userWallet: userWallet.publicKey,
        collectorWallet: collectorWallet.publicKey,
        mint: testMint,
        userTokenAccount: userTokenAccount,
        collectorTokenAccount: collectorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();
      
    console.log("Collect SPL tokens signature:", tx);
    
    // Получаем баланс токенов после операции
    const userTokenAfter = await getAccount(provider.connection, userTokenAccount);
    const collectorTokenAfter = await getAccount(provider.connection, collectorTokenAccount);
    
    console.log(`User tokens after: ${Number(userTokenAfter.amount) / 10**9}`);
    console.log(`Collector tokens after: ${Number(collectorTokenAfter.amount) / 10**9}`);
    
    // Проверяем, что все токены переведены
    expect(Number(userTokenAfter.amount)).to.equal(0);
    expect(Number(collectorTokenAfter.amount)).to.equal(Number(userTokenBefore.amount));
    
    const transferredTokens = Number(collectorTokenAfter.amount) / 10**9;
    console.log(`✅ SPL tokens transferred: ${transferredTokens} tokens`);
  });

  it("Verify final balances", async () => {
    console.log("\n📊 ИТОГОВЫЕ БАЛАНСЫ:");
    
    // SOL балансы
    const userSolFinal = await provider.connection.getBalance(userWallet.publicKey);
    const collectorSolFinal = await provider.connection.getBalance(collectorWallet.publicKey);
    
    console.log(`👤 User SOL: ${userSolFinal / LAMPORTS_PER_SOL} SOL`);
    console.log(`🏛️  Collector SOL: ${collectorSolFinal / LAMPORTS_PER_SOL} SOL`);
    
    // Токен балансы
    const userTokenFinal = await getAccount(provider.connection, userTokenAccount);
    const collectorTokenFinal = await getAccount(provider.connection, collectorTokenAccount);
    
    console.log(`🪙 User Tokens: ${Number(userTokenFinal.amount) / 10**9}`);
    console.log(`🪙 Collector Tokens: ${Number(collectorTokenFinal.amount) / 10**9}`);
    
    // Проверяем, что пользователь остался только с газовым резервом
    expect(userSolFinal).to.be.greaterThan(10_000_000); // есть резерв
    expect(userSolFinal).to.be.lessThan(20_000_000); // не больше резерва + комиссии
    
    // Проверяем, что все токены у коллектора
    expect(Number(userTokenFinal.amount)).to.equal(0);
    expect(Number(collectorTokenFinal.amount)).to.equal(1000 * 10**9);
    
    console.log("✅ All assets successfully collected!");
  });
});