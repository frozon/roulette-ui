// @ts-ignore
import { networks as deployedNetworks, abi as rouletteAbi } from '@sakuracasino/roulette-contract';
import { Contract } from '@ethersproject/contracts'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { formatEther, parseEther } from '@ethersproject/units';
import { splitSignature } from '@ethersproject/bytes';
import { MaxUint256 } from '@ethersproject/constants';
import { Web3Provider } from '@ethersproject/providers';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import { ERC20_PERMIT } from '../data/abis';
import { Bet, BetForContract, Network } from '../types';
import { getPermitData } from './permit';

// export const networks = process.env.NODE_ENV !== 'development' ? deployedNetworks : [
//   ...deployedNetworks,
//   {
//     "title": "Ganache",
//     "chain_id": 1337,
//     "network_id": 1337,
//     "network_name": "ganache",
//     "bet_token_address": process.env.BET_TOKEN_ADDRESS,
//     "contract_address": process.env.ROULETTE_ADDRESS,
//     "sphere_token_address": process.env.SPHERE_TOKEN_ADDRESS,
//   }
// ];
export const networks = [
  {
    "title":"Mumbai Testnet",
    "chain_id":80001,
    "network_id":80001,
    "network_name":"mumbai",
    "bet_token_address":"0x6B79527Ab13504E22BfEc53D2D03673d745b9b47",
    "contract_address":"0x5e95e1FFc27f84e7c689CA08aCE55DF85ae02E13",
    "sphere_token_address":"0x7982ba39b9cDf73393f167B995e6B16E126634fD",
    "vrf_coordinator_address":"0x3d2341ADb2D31f1c5530cDC622016af293177AE0",
    "link_token_address":"0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
    "keyHash":"0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da",
    "vrf_fee":"100000000000000"
  }
]
export const supportedChainIds = networks.map((network: {chain_id: number}) => network.chain_id);

const contracts = new Map();

export default class NetworkHelper {
  private web3React: Web3ReactContextInterface<Web3Provider>;
  private account: string | null | undefined;
  private chainId: number;
  
  constructor(web3React: Web3ReactContextInterface<Web3Provider>) {
    this.web3React = web3React;
    this.account = web3React.account;
    this.chainId = web3React.chainId || 1;
  }

  public checkActive() {
    if(!this.web3React.active) {
      throw 'web3 provider is inactive';
    }
  }

  public getNetwork(): Network {
    this.checkActive();
    const network = networks.find((network: Network) => network.chain_id === this.chainId);
    if (!network) {
      throw `Network with chainId ${this.chainId} not found`;
    }
    return network;
  }

  public getBetTokenContract() {
    const network = this.getNetwork();
    const contractHash = `${network.bet_token_address}-${this.account || ''}`;
    if (!contracts.get(contractHash)) {
      contracts.set(contractHash, new Contract(
        network.bet_token_address,
        ERC20_PERMIT,
        this.web3React.library?.getSigner(this.account || ''),
      ));
    }
    return contracts.get(contractHash);
  }

  public getSphereTokenContract() {
    const network = this.getNetwork();
    const contractHash = `${network.sphere_token_address}-${this.account || ''}`;
    if(!contracts.get(contractHash)) {
      contracts.set(contractHash, new Contract(
        network.sphere_token_address,
        ERC20_PERMIT,
        this.web3React.library?.getSigner(this.account || ''),
      ));
    }
    return contracts.get(contractHash);
  }

  public getRouletteContract() {
    const network = this.getNetwork();
    const contractHash = `${network.contract_address}-${this.account || ''}`;
    if (!contracts.get(contractHash)) {
      contracts.set(contractHash, new Contract(
        network.contract_address,
        rouletteAbi,
        this.web3React.library?.getSigner(this.account || ''),
      ));
    }
    return contracts.get(contractHash);
  }

  async getRouletteTotalLiquidity() {
    const rouletteContract = await this.getRouletteContract();
    return Number(await this.getBetTokenBalance((rouletteContract.address)));
  }

  async getAddressLiquidity(address: string) {
    const totalLiquidity = await this.getRouletteTotalLiquidity();
    const roulette = await this.getRouletteContract();
    const totalShares = Number(this.fromTokenDecimals(await roulette.totalSupply()));
    const addressShares = Number(this.fromTokenDecimals(await roulette.balanceOf(address)))
    return totalLiquidity * (addressShares / totalShares);
  }

  async getRequestIdAddress(requestId: string) {
    const roulette = await this.getRouletteContract();
    return await roulette.requesterOf(requestId);
  }

  async addLiquidity(amount: BigNumber, ...signature: any[]) {
    const roulette = await this.getRouletteContract();
    const method = signature.length > 1 ? 'addLiquidity(uint256,uint256,uint256,bool,uint8,bytes32,bytes32)' : 'addLiquidity(uint256)';
    const tx = await roulette[method](amount, ...signature);
    await tx.wait(1);
    return tx;
  }

  async removeLiquidity() {
    const roulette = await this.getRouletteContract();
    const tx = roulette.removeLiquidity();
    await tx.wait(1);
    return tx;
  }

  async cashIn(amount: BigNumber, ...signature: any[]) {
    const roulette = await this.getRouletteContract();
    const tx = await roulette['cashIn(uint256)'](amount, ...signature);
    await tx.wait(1);
    return tx
  }

  async cashOut(amount: BigNumber, ...signature: any[]) {
    const roulette = await this.getRouletteContract();
    const tx = await roulette['cashOut(uint256)'](amount, ...signature);
    await tx.wait(1);
    return tx
  }

  async rollBets(betsForContract: BetForContract[], randomSeed: string, ...signature: any[]) {
    const roulette = await this.getRouletteContract();
    const method = 'rollBets((uint8,uint8,uint256)[],uint256)';
    const tx = await roulette[method](betsForContract, randomSeed, ...signature);
    await tx.wait(1);
    return tx;
  }

  public toTokenDecimals(value: number) {
    return parseEther(value.toFixed(2));
  }

  public fromTokenDecimals(value: BigNumberish) {
    return formatEther(value);
  }

  public async getBetTokenBalance(account: string) {
    const tokenContract = this.getBetTokenContract();
    return this.fromTokenDecimals((await tokenContract.balanceOf(account)))
  }

  public async getBetFee() {
    const roulette = await this.getRouletteContract();
    return this.fromTokenDecimals(await roulette.getBetFee());
  }

  public getBetsForContract(bets: Bet[]): BetForContract[] {
    return bets.map((bet: Bet) => ({
      betType: `${bet.type}`,
      value: `${bet.value}`,
      amount: this.toTokenDecimals(bet.amount).toString(),
    }));
  }

  public async approveTokenAmount(amount: BigNumber): Promise<any[]> {
    const tokenContract = await this.getBetTokenContract();
    const rouletteContract = await this.getRouletteContract();

    // TODO: Removed temporarly, intended for efficient DAI bets
    // if (tokenContract.permit) {
    //   return await this.permitTokenUsage();
    // }

    const tx = await tokenContract.approve(rouletteContract.address, amount);
    await tx.wait(1);
    return [{from: this.account}];
  }

  public async approveSphereTokenAmount(amount: BigNumber): Promise<any[]> {
    const tokenContract = await this.getSphereTokenContract();
    const rouletteContract = await this.getRouletteContract();

    const tx = await tokenContract.approve(rouletteContract.address, amount);
    await tx.wait(1);
    return [{from: this.account}];
  }

  public async isSphereApproved(): Promise<any[]> {
    // const tokenContract = await this.getSphereTokenContract();
    // const rouletteContract = await this.getRouletteContract();
    // const expiry = MaxUint256.toString();
    // const nonce = (await tokenContract.nonces(this.account || '')).toString();

    // const data = await getPermitData({
    //   chainId: this.chainId,
    //   tokenContract,
    //   holder: this.account || '',
    //   spender: rouletteContract.address,
    //   expiry,
    //   nonce,
    // });
    return [];
  }

  private async permitTokenUsage(): Promise<any[]> {
    const tokenContract = await this.getBetTokenContract();
    const rouletteContract = await this.getRouletteContract();
    const expiry = MaxUint256.toString();
    const nonce = (await tokenContract.nonces(this.account || '')).toString();
    const data = await getPermitData({
      chainId: this.chainId,
      tokenContract,
      holder: this.account || '',
      spender: rouletteContract.address,
      expiry,
      nonce,
    });
    const rawSignature = await this.web3React.library?.send('eth_signTypedData_v3', [this.account, data]);
    const signature = splitSignature(rawSignature);
    return [
      nonce,
      expiry,
      true,
      `${signature.v}`,
      signature.r,
      signature.s,
      {from: this.account}
    ];
  }
};

