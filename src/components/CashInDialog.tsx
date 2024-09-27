import React, { useCallback, useEffect, useState } from 'react';
import Dialog, { useDialogAnimation } from './Dialog';
import { useDispatch, useSelector } from 'react-redux';
import BigButton from './BigButton';
import NumberInput from './NumberInput';
import './CashInDialog.scss';
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import NetworkHelper from '../libs/NetworkHelper';
import { BigNumber } from '@ethersproject/bignumber';
import { updateNetwork } from '../flux/slices/networkSlice';

import ApproveButton from './ApproveButton';

type CashInFormDialogProps = {
  open: boolean,
  onClose: () => void,
  onCashIn: (amount: string) => void,
};

const CashInFormDialog = (props: CashInFormDialogProps) => {
  const dispatch = useDispatch();
  const {open, onClose, onCashIn} = props;
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

  const cashIn = useCallback(async (_signatureParams) => {
    const cashInTx = await networkHelper.cashIn(amountWei, ..._signatureParams);
    await cashInTx.wait(1);
    onClose();
    dispatch(updateNetwork(web3React));
  }, [web3React, amountWei, onClose]);

  return (
    <Dialog open={open} onCloseModal={onClose}>
      <div className="CashInFormDialog">
        <NumberInput
          value={inputValue}
          onChange={_value => setInputValue(_value)}
          labelText="Cash in amount"
          onKeyDown={e => e.key === 'Enter' && onCashIn(inputValue)}
          >
        </NumberInput>
        <div className="CashInFormDialog__multi-button">
          <ApproveButton
            label="Cash in"
            amount={amountWei}
            onError={animate}
            onSubmit={cashIn}
            closed={!open}
            approveFunc={networkHelper.approveSphereTokenAmount.bind(networkHelper)}
          />
        </div>
      </div>
    </Dialog>
  );
}

export default CashInFormDialog;