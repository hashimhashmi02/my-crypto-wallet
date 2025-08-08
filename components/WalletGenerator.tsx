"use client";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";

interface Wallet {
  publicKey: string;
  privateKey: string;
  path: string;
}

const WalletGenerator = () => {
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [pathType, setPathType] = useState<string>('');
  const [mnemonicInput, setMnemonicInput] = useState<string>("");
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<boolean[]>([]);
  
  
  const [uiStep, setUiStep] = useState('initial'); // 'initial', 'showMnemonic', 'showWallets'

  const deriveWallet = (
    mnemonic: string,
    currentPathType: string,
    accountIndex: number
  ): Wallet | null => {
    if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
      toast.error("Invalid recovery phrase.");
      return null;
    }
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    try {
      if (currentPathType === "60") {
        const path = `m/44'/60'/${accountIndex}'/0/0`;
        const masterNode = ethers.HDNodeWallet.fromSeed(seedBuffer);
        const wallet = masterNode.derivePath(path);
        return { publicKey: wallet.address, privateKey: wallet.privateKey, path: path };
      } else if (currentPathType === "501") {
        const path = `m/44'/501'/${accountIndex}'/0'`;
        const { key: derivedSeed } = derivePath(path, seedBuffer.toString("hex"));
        const secretKey = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
        const keypair = Keypair.fromSecretKey(secretKey);
        return { publicKey: keypair.publicKey.toBase58(), privateKey: bs58.encode(secretKey), path: path };
      } else {
        toast.error("Unsupported blockchain selected.");
        return null;
      }
    } catch (error) {
      console.error("Derivation Error:", error);
      toast.error("Failed to derive wallet.");
      return null;
    }
  };



  const handleGeneratePhrase = () => {
    let mnemonicToUse = mnemonicInput.trim();
    if (!mnemonicToUse) {
      mnemonicToUse = ethers.Mnemonic.fromEntropy(ethers.randomBytes(16)).phrase;
    }
    
    if (ethers.Mnemonic.isValidMnemonic(mnemonicToUse)) {
      setMnemonicWords(mnemonicToUse.split(" "));
      setUiStep('showMnemonic'); 
    } else {
      toast.error("Invalid recovery phrase.");
    }
  };


  const handleConfirmAndCreateWallets = () => {
    const mnemonic = mnemonicWords.join(" ");
    const newWallet = deriveWallet(mnemonic, pathType, 0);

    if (newWallet) {
      setWallets([newWallet]);
      setVisiblePrivateKeys([false]);
      setUiStep('showWallets'); 
      toast.success("Wallet generated successfully!");
    }
  };
  
  
  const handleAddWallet = () => {
    if (mnemonicWords.length === 0) {
      toast.error("Generate or import a wallet first.");
      return;
    }
    const newAccountIndex = wallets.length;
    const mnemonic = mnemonicWords.join(" ");
    const newWallet = deriveWallet(mnemonic, pathType, newAccountIndex);
    if (newWallet) {
      setWallets(prevWallets => [...prevWallets, newWallet]);
      setVisiblePrivateKeys(prev => [...prev, false]);
      toast.success(`Account ${newAccountIndex + 1} added successfully!`);
    }
  };

  const handleClearWallets = () => {
    setWallets([]);
    setMnemonicWords([]);
    setPathType('');
    setVisiblePrivateKeys([]);
    setUiStep('initial'); 
    toast.success("All wallets cleared.");
  };

  const togglePrivateKeyVisibility = (index: number) => {
    setVisiblePrivateKeys(
      visiblePrivateKeys.map((visible, i) => (i === index ? !visible : visible))
    );
  };
  
  
  useEffect(() => {
    const storedWallets = localStorage.getItem("wallets");
    const storedMnemonic = localStorage.getItem("mnemonics");
    const storedPath = localStorage.getItem("pathType");
    if (storedWallets && storedMnemonic && storedPath) {
      const parsedWallets: Wallet[] = JSON.parse(storedWallets);
      setMnemonicWords(JSON.parse(storedMnemonic));
      setWallets(parsedWallets);
      setPathType(JSON.parse(storedPath));
      setVisiblePrivateKeys(new Array(parsedWallets.length).fill(false));
      setUiStep('showWallets'); 
    }
  }, []);

  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem("wallets", JSON.stringify(wallets));
      localStorage.setItem("mnemonics", JSON.stringify(mnemonicWords));
      localStorage.setItem("pathType", JSON.stringify(pathType));
    } else {
      localStorage.removeItem("wallets");
      localStorage.removeItem("mnemonics");
      localStorage.removeItem("pathType");
    }
  }, [wallets, mnemonicWords, pathType]);

 
  return (
    <div className="flex flex-col gap-8 p-4 max-w-4xl mx-auto">
     
      {uiStep === 'initial' && (
        <div>
          {!pathType ? (
            <div className="text-center my-12">
              <h1 className="text-4xl font-bold tracking-tight">Choose a blockchain to start</h1>
              <div className="flex gap-4 justify-center mt-4">
                <button className="px-6 py-2 bg-rose-500 text-white rounded-lg" onClick={() => setPathType("60")}>Ethereum</button>
                <button className="px-6 py-2 bg-fuchsia-600 text-white rounded-lg" onClick={() => setPathType("501")}>Solana</button>
              </div>
            </div>
          ) : (
            <div className="my-12">
              <h1 className="text-4xl font-bold tracking-tight">Secret Recovery Phrase</h1>
              <p className="text-gray-500 mt-2">Enter an existing phrase or leave blank to generate a new one.</p>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <input type="password" placeholder="Enter your secret phrase..." className="flex-grow p-2 border rounded-md" value={mnemonicInput} onChange={(e) => setMnemonicInput(e.target.value)} />
                <button className="px-8 py-2 bg-teal-600 text-white rounded-lg" onClick={handleGeneratePhrase}>
                  {mnemonicInput ? "Import Wallet" : "Generate New Wallet"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      
      {uiStep === 'showMnemonic' && (
        <div className="my-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Save Your Secret Phrase!</h1>
            <p className="text-red-500 mt-2">This is the only way to recover your wallet. Store it somewhere safe.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 my-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
                {mnemonicWords.map((word, index) => (
                    <p key={index} className="p-2 font-mono">{index + 1}. {word}</p>
                ))}
            </div>
            <button className="px-8 py-3 bg-teal-600 text-white rounded-lg" onClick={handleConfirmAndCreateWallets}>
                I&apos;ve Saved My Phrase, Create Wallets
            </button>
        </div>
      )}
      
  
      {uiStep === 'showWallets' && wallets.length > 0 && (
         <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold tracking-tighter">Your Wallets</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-teal-500 text-white rounded-lg" onClick={handleAddWallet}>Add Account</button>
              <button className="px-4 py-2 bg-red-800 text-white rounded-lg" onClick={handleClearWallets}>Clear All</button>
            </div>
          </div>
          <div className="grid gap-6">
            {wallets.map((wallet, index) => (
              <div key={wallet.publicKey} className="flex flex-col p-6 border rounded-2xl">
                <h3 className="font-bold text-2xl tracking-tighter">Account {index + 1}</h3>
                <p className="text-sm text-gray-400 mb-4">{wallet.path}</p>
                <div className="mb-4">
                  <span className="font-bold text-lg">Public Key / Address</span>
                  <p className="text-gray-600 font-mono break-all">{wallet.publicKey}</p>
                </div>
                <div>
                  <span className="font-bold text-lg">Private Key</span>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 font-mono break-all flex-grow">
                      {visiblePrivateKeys[index] ? wallet.privateKey : "••••••••••••••••••••••••••••••••••••••••"}
                    </p>
                    <button onClick={() => togglePrivateKeyVisibility(index)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletGenerator;