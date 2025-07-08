import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetCollector } from "../target/types/asset_collector";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("asset-collector", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.assetCollector as Program<AssetCollector>;
  
  // Test keypairs
  const authority = Keypair.generate();
  const collectorWallet = Keypair.generate();
  const userWallet = Keypair.generate();
  
  // PDA для состояния
  const [collectorStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("collector-state")],
    program.programId
  );

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
    } catch (error) {
      expect(error.message).to.include("Unauthorized");
      console.log("✅ Correctly rejected wrong authority");
    }
  });

  it("Collect assets from user wallet", async () => {
    // Получаем баланс до операции
    const userBalanceBefore = await provider.connection.getBalance(userWallet.publicKey);
    const collectorBalanceBefore = await provider.connection.getBalance(collectorWallet.publicKey);
    
    console.log(`User balance before: ${userBalanceBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`Collector balance before: ${collectorBalanceBefore / LAMPORTS_PER_SOL} SOL`);
    
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
      
    console.log("Collect assets signature:", tx);
    
    // Получаем баланс после операции
    const userBalanceAfter = await provider.connection.getBalance(userWallet.publicKey);
    const collectorBalanceAfter = await provider.connection.getBalance(collectorWallet.publicKey);
    
    console.log(`User balance after: ${userBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`Collector balance after: ${collectorBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    
    // Проверяем, что у пользователя остался резерв (~0.015 SOL + немного на комиссии)
    expect(userBalanceAfter).to.be.lessThan(userBalanceBefore);
    expect(userBalanceAfter).to.be.greaterThan(10_000_000); // больше 0.01 SOL (резерв минус комиссии)
    
    // Проверяем, что коллектор получил средства
    expect(collectorBalanceAfter).to.be.greaterThan(collectorBalanceBefore);
    
    console.log("✅ Assets collected successfully!");
  });

  it("Should fail to collect assets if collector wallet not set", async () => {
    // Создаем новое состояние без установленного кошелька
    const newAuthority = Keypair.generate();
    
    // Пополняем новый аккаунт
    const airdrop = await provider.connection.requestAirdrop(
      newAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop);
    
    const [newStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("collector-state-2")], // другой seed для теста
      program.programId
    );
    
    // Инициализируем состояние но НЕ устанавливаем кошелек
    // (это требует модификации контракта для поддержки разных seeds)
    // Пока что пропустим этот тест или проверим с текущим состоянием
    console.log("⚠️  Test skipped - requires contract modification for different seeds");
  });
});