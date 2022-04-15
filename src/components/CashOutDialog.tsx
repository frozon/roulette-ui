import React, { useCallback, useEffect, useState } from 'react';
import Dialog, { useDialogAnimation } from './Dialog';
import { useDispatch, useSelector } from 'react-redux';
import BigButton from './BigButton';
import NumberInput from './NumberInput';
import './CashOutDialog.scss';
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import NetworkHelper from '../libs/NetworkHelper';
import { BigNumber } from '@ethersproject/bignumber';
import { updateNetwork } from '../flux/slices/networkSlice';

import ApproveButton from './ApproveButton';

type CashOutFormDialogProps = {
  open: boolean,
  onClose: () => void,
  onCashOut: (amount: string) => void,
};

const CashOutFormDialog = (props: CashOutFormDialogProps) => {
  const dispatch = useDispatch();
  const {open, onClose, onCashOut} = props;
  const [inputValue, setInputValue] = useState(`${''}`);
  const [animation, animate] = useDialogAnimation();

  const web3React = useWeb3React<Web3Provider>();
  const networkHelper = new NetworkHelper(web3React);
  (async () => {
    await networkHelper.isSphereApproved();
  })();

  useEffect(() => {
    setInputValue(`${''}`);
  }, [open])

  const amountWei = networkHelper.toTokenDecimals(Number(inputValue) || 0);

  const cashOut = useCallback(async (_signatureParams) => {
    const cashInTx = await networkHelper.cashOut(amountWei, ..._signatureParams);
    await cashInTx.wait(1);
    onClose();
    dispatch(updateNetwork(web3React));
  }, [web3React, amountWei, onClose]);

  return (
    <Dialog open={open} onCloseModal={onClose}>
      <div className="CashOutFormDialog">
        <NumberInput
          value={inputValue}
          onChange={_value => setInputValue(_value)}
          labelText="Cash out amount"
          onKeyDown={e => e.key === 'Enter' && onCashOut(inputValue)}
          >
        </NumberInput>
        <div className="CashOutFormDialog__multi-button">
          <ApproveButton
            label="Cash out"
            amount={amountWei}
            onError={animate}
            onSubmit={cashOut}
            closed={!open}
            approveFunc={networkHelper.approveTokenAmount.bind(networkHelper)}
          />
        </div>
      </div>
    </Dialog>
  );
}

export default CashOutFormDialog;