import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';

import { AppState } from '../flux/store';
import { updateNetwork } from '../flux/slices/networkSlice';
import ApproveButton from './ApproveButton';
import BigButton from './BigButton';
import Message from './Message';
import Dialog, { useDialogAnimation } from './Dialog';
import NumberInput from './NumberInput';
import './PoolPage.scss'
import NetworkHelper from '../libs/NetworkHelper';
const BET_TOKEN = process.env.BET_TOKEN_NAME || 'DAI';

const RemoveLiquidityDialog = function ({opened, onClose}: {opened: boolean, onClose: () => void}) {
  const dispatch = useDispatch();
  const web3React = useWeb3React<Web3Provider>();
  const [animation, animate] = useDialogAnimation();
  const [loading, setLoading] = useState<boolean>(false);
  const networkHelper = new NetworkHelper(web3React);
  const account: string = useSelector((state: AppState) => state.network.account);
  const accountLiquidity: number = useSelector((state: AppState) => state.network.accountLiquidity) || 0;

  const removeLiquidity = useCallback(async () => {
    const roulette = networkHelper.getRouletteContract();
    try {
      setLoading(true);
      const removeLiquidityTx = await roulette.removeLiquidity({from: account});
      await removeLiquidityTx.wait(1);
      dispatch(updateNetwork(web3React));
      setLoading(false);
      onClose();
    } catch(error) {
      animate();
      setLoading(false);
    }
  }, [networkHelper, onClose]);

  return (
    <Dialog open={opened} onCloseModal={onClose} animation={animation}>
      <div className="RemoveLiquidityDialog">
        <div className="RemoveLiquidityDialog__title">Remove liquidity</div>
        <div className="RemoveLiquidityDialog__liquidity-share">
          <div className="RemoveLiquidityDialog__liquidity-share-label">
            To withdraw
          </div>
          <div className="RemoveLiquidityDialog__liquidity-share-value">
            {accountLiquidity.toFixed(2)} {BET_TOKEN}
          </div>
        </div>
        <BigButton loading={loading} onClick={removeLiquidity}>Withdraw</BigButton>
      </div>
    </Dialog>
  )
};


const AddLiquidityDialog = function ({opened, onClose}: {opened: boolean, onClose: () => void}) {
  const dispatch = useDispatch();
  const web3React = useWeb3React<Web3Provider>();
  const [amount, setAmount] = useState('');
  const [animation, animate] = useDialogAnimation();
  const networkHelper = new NetworkHelper(web3React);
  const contractLiquidityBalance: number = useSelector((state: AppState) => state.network.contractLiquidityBalance);

  const amountNull = !Number(amount);
  const amountShare = amountNull ? '0%' : `${(100 * Number(amount) / (Number(amount) + contractLiquidityBalance)).toFixed(2)}%`;
  const amountWei = networkHelper.toTokenDecimals(Number(amount) || 0);

  const addLiquidity = useCallback(async (signatureParams: any[]) => {
    const addLiquidityTx = await networkHelper.addLiquidity(amountWei, ...signatureParams);
    await addLiquidityTx.wait(1);
    onClose();
    dispatch(updateNetwork(web3React));
  }, [networkHelper, amountWei, onClose]);

  useEffect(() => {
    if (opened) setAmount('');
  }, [opened]);

  return (
    <Dialog open={opened} onCloseModal={onClose} animation={animation}>
      <div className="AddLiquidityDialog">
        <div className="AddLiquidityDialog__title">Add liquidity</div>
        <NumberInput labelText="Amount" value={amount} onChange={value => setAmount(value)}>{BET_TOKEN}</NumberInput>
        <div className="AddLiquidityDialog__liquidity-share">
          <div className="AddLiquidityDialog__liquidity-share-label">
            Share of Pool
          </div>
          <div className="AddLiquidityDialog__liquidity-share-value">
            {amountShare}
          </div>
        </div>
        <ApproveButton
          label="Add Liquidity"
          amount={amountWei}
          onError={animate}
          closed={!opened}
          onSubmit={addLiquidity}
          approveFunc={networkHelper.approveTokenAmount}
        />
      </div>
    </Dialog>
  )
};

const PoolPage = function () {
  const [addLiquidityDialogOpened, setAddLiquidityDialogState] = useState(false);
  const [removeLiquidityDialogOpened, setRemoveLiquidityDialogState] = useState(false);
  const contractLiquidityBalance: number = useSelector((state: AppState) => state.network.contractLiquidityBalance);
  const accountLiquidity: number = useSelector((state: AppState) => state.network.accountLiquidity);
  return (
    <div className="PoolPage">
      <Message className="PoolPage__warning" type="warning">
        <b>Warning: </b> the roulette contract has not been audited yet.<br />
        Please be sure to
        <a href="https://docs.sakura.casino/guide/pooling/" target="_blank"> know the risks </a>
        before providing liquidity.
      </Message>
      <div className="LiquidityBlock__container">
        <div className="LiquidityBlock">
            <div className="LiquidityBlock__info-table">
              <div className="LiquidityBlock__info">
                <div className="LiquidityBlock__label">Total staked</div>
                <div className="LiquidityBlock__value">{contractLiquidityBalance.toFixed(2)} <span className="staked-token">{BET_TOKEN}</span></div>
              </div>
              <div className="LiquidityBlock__info">
                <div className="LiquidityBlock__label">Your staked amount</div>
                <div className="LiquidityBlock__value">{accountLiquidity ? accountLiquidity.toFixed(2) : '-'} <span className="staked-token">{BET_TOKEN}</span></div>
              </div>
              <div className="LiquidityBlock__info">
                <div className="LiquidityBlock__label">Your pool share</div>
                <div className="LiquidityBlock__value">{accountLiquidity ? `${(100 * accountLiquidity / contractLiquidityBalance).toFixed(2)}%` : '-'}</div>
              </div>
            </div>
            <div className="LiquidityBlock__actions">
              <button onClick={() => setAddLiquidityDialogState(true)}>Add Liquidity</button>
              <button onClick={() => setRemoveLiquidityDialogState(true)}>Remove Liquidity</button>
            </div>
        </div>
      </div>
      <AddLiquidityDialog opened={addLiquidityDialogOpened} onClose={() => setAddLiquidityDialogState(false)}/>
      <RemoveLiquidityDialog opened={removeLiquidityDialogOpened} onClose={() => setRemoveLiquidityDialogState(false)}/>
    </div>
  );
};

export default PoolPage;