import React, { useState, useCallback } from 'react';
import { Web3Provider } from '@ethersproject/providers'
import { useWeb3React } from '@web3-react/core'
import { useDispatch } from 'react-redux';
import { updateNetwork } from '../flux/slices/networkSlice';

// @ts-ignore
import RouletteLogo from '../assets/roulette-logo.svg';
import ConnectWalletButton from './ConnectWalletButton';
import NetworkHelper from '../libs/NetworkHelper';

import './TopBar.scss';
export default function TopBar() {
  const web3React = useWeb3React<Web3Provider>();
  const [mintLoading, setMintLoading] = useState(false);
  const dispatch = useDispatch();

  const onTokenDropClick = useCallback(async () => {
    setMintLoading(true);
    const networkHelper = new NetworkHelper(web3React);
    const betTokenContract = await networkHelper.getBetTokenContract();
    try {
      const tx = await betTokenContract.mint(web3React.account, networkHelper.toTokenDecimals(1000));
      await tx.wait(1);
    } catch (e) {}
    setMintLoading(false);
    dispatch(updateNetwork(web3React));
  }, [web3React.active, dispatch]);

  return (
    <div className="TopBar">
      <div className="TopBar__left-menu">
        <img className="TopBar__logo" src={RouletteLogo} />
        <ul className="TopBar__menu">
          <li className="active">Bet</li>
          <li>Pool</li>
        </ul>
        {web3React.active && <div className="dai-mint-container">
          <div className="dai-mint-btn" onClick={mintLoading ? undefined : onTokenDropClick}>
            {mintLoading ? 'minting...' : 'Mint DAI'}
          </div>
        </div>}
      </div>
      <div className="TopBar__right-menu">
        <ConnectWalletButton />
      </div>
    </div>
  );
};