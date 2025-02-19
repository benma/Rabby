import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { KEYRING_CLASS } from 'consts';
import { useApproval, useWallet } from 'ui/utils';
import { hex2Text } from 'ui/utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import { Modal } from 'ui/component';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import AccountCard from './AccountCard';
import IconQuestionMark from 'ui/assets/question-mark-gray.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

interface SignTextProps {
  data: string[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

export const WaitingSignComponent = {
  // [KEYRING_CLASS.HARDWARE.LEDGER]: 'HardwareWaiting',
  [KEYRING_CLASS.WATCH]: 'WatchAdrressWaiting',
};

const SignText = ({ params }: { params: SignTextProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { data, session } = params;
  const [hexData] = data;
  const signText = hex2Text(hexData);
  const [showSecurityCheckDetail, setShowSecurityCheckDetail] = useState(false);
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('pending');
  const [securityCheckAlert, setSecurityCheckAlert] = useState('Checking...');
  const [
    securityCheckDetail,
    setSecurityCheckDetail,
  ] = useState<SecurityCheckResponse | null>(null);
  const [explain, setExplain] = useState('');

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();
    const check = await wallet.openapi.checkText(
      currentAccount!.address,
      session.origin,
      hexData
    );
    const serverExplain = await wallet.openapi.explainText(
      session.origin,
      currentAccount!.address,
      hexData
    );
    setExplain(serverExplain.comment);
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    setSecurityCheckDetail(check);
  };

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };

  const handleAllow = async (doubleCheck = false) => {
    if (
      !doubleCheck &&
      securityCheckStatus !== 'pass' &&
      securityCheckStatus !== 'pending'
    ) {
      setShowSecurityCheckDetail(true);

      return;
    }
    const currentAccount = await wallet.getCurrentAccount();
    if (
      currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER &&
      !(await wallet.isUseLedgerLive())
    ) {
      try {
        const keyring = await wallet.connectHardware(
          KEYRING_CLASS.HARDWARE.LEDGER
        );
        if (keyring.isWebUSB) {
          const transport = await TransportWebUSB.create();
          await transport.close();
        }
      } catch (e) {
        // NOTHING
      }
    }
    if (currentAccount?.type && WaitingSignComponent[currentAccount?.type]) {
      resolveApproval({
        uiRequestComponent: WaitingSignComponent[currentAccount?.type],
        type: currentAccount.type,
        address: currentAccount.address,
      });

      return;
    }

    resolveApproval({});
  };

  const handleViewRawClick = () => {
    Modal.info({
      title: t('Transaction detail'),
      centered: true,
      content: hexData,
      cancelText: null,
      okText: null,
      className: 'transaction-detail',
    });
  };

  return (
    <>
      <AccountCard />
      <div className="approval-text">
        <p className="section-title">
          {t('Sign Text')}
          <span
            className="float-right text-gray-comment text-12 cursor-pointer flex items-center view-raw"
            style={{ lineHeight: '16px !important' }}
            onClick={handleViewRawClick}
          >
            {t('view Raw')} <img src={IconArrowRight} />
          </span>
        </p>
        <div className="text-detail-wrapper gray-section-block">
          <div className="text-detail text-gray-subTitle">{signText}</div>
          {explain && (
            <p className="text-explain">
              {explain}
              <Tooltip
                placement="top"
                overlayClassName="text-explain-tooltip"
                title={t(
                  'This summary information is provide by DeBank OpenAPI'
                )}
              >
                <img
                  src={IconQuestionMark}
                  className="icon icon-question-mark"
                />
              </Tooltip>
            </p>
          )}
        </div>
      </div>
      <footer>
        <SecurityCheckBar
          status={securityCheckStatus}
          alert={securityCheckAlert}
          onClick={() => setShowSecurityCheckDetail(true)}
          onCheck={handleSecurityCheck}
        />
        <div className="action-buttons flex justify-between">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleCancel}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={() => handleAllow()}
          >
            {securityCheckStatus === 'pass' || securityCheckStatus === 'pending'
              ? t('Sign')
              : t('Continue')}
          </Button>
        </div>
      </footer>
      {securityCheckDetail && (
        <SecurityCheckDetail
          visible={showSecurityCheckDetail}
          onCancel={() => setShowSecurityCheckDetail(false)}
          data={securityCheckDetail}
          onOk={() => handleAllow(true)}
          okText={t('Sign')}
          cancelText={t('Cancel')}
        />
      )}
    </>
  );
};

export default SignText;
