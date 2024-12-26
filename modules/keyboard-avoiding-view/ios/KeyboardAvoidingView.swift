import ExpoModulesCore

// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class KeyboardAvoidingView: ExpoView {
  private let measurer = UIView()
  private let container = UIView()
  private var scrollView: ScrollViewWrapper?
  private var animationInProgress = false
  private var measurerHasObserver = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    addSubview(measurer)
    measurer.translatesAutoresizingMaskIntoConstraints = false
    measurer.isHidden = true

    addSubview(container)
    container.translatesAutoresizingMaskIntoConstraints = false

    NSLayoutConstraint.activate([
      measurer.topAnchor.constraint(equalTo: keyboardLayoutGuide.topAnchor),
      measurer.leadingAnchor.constraint(equalTo: leadingAnchor),
      measurer.trailingAnchor.constraint(equalTo: trailingAnchor),
      measurer.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    NSLayoutConstraint.activate([
      container.heightAnchor.constraint(equalTo: heightAnchor),
      container.leadingAnchor.constraint(equalTo: leadingAnchor),
      container.trailingAnchor.constraint(equalTo: trailingAnchor),
      container.bottomAnchor.constraint(equalTo: keyboardLayoutGuide.topAnchor),
    ])

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardWillShow),
      name: UIResponder.keyboardWillShowNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardDidShow),
      name: UIResponder.keyboardDidShowNotification,
      object: nil
    )

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardWillHide),
      name: UIResponder.keyboardWillHideNotification,
      object: nil
    )
  }

  deinit {
    if measurerHasObserver {
      measurer.removeObserver(self, forKeyPath: "center")
    }
  }

  @objc private func keyboardWillShow(_ notification: Notification) {
    keyboardLayoutGuide.followsUndockedKeyboard = true
    updateInsets(notification)
  }

  @objc private func keyboardDidShow(_ notification: Notification) {
    // FIXME: don't use KVO
    if !measurerHasObserver {
      measurer.addObserver(self, forKeyPath: "center", options: .new, context: nil)
    }
  }

  private func updateInsets(_ notification: Notification, closing: Bool = false) {
    let userInfo = notification.userInfo

    guard let animationCurve = userInfo?[UIResponder.keyboardAnimationCurveUserInfoKey] as? UInt,
      let animationDuration = userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey]
        as? Double,
      let frameEnd = userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue,
      let fromCoordinateSpace = window?.screen.coordinateSpace
    else { return }

    let animationOptions = UIView.AnimationOptions(rawValue: animationCurve << 16)

    let absoluteOrigin = convert(bounds, to: fromCoordinateSpace)
    let keyboardHeight =
      closing ? 0 : fmax(CGRectGetMaxY(absoluteOrigin) - frameEnd.cgRectValue.origin.y, 0)

    animationInProgress = true
    UIView.animate(
      withDuration: animationDuration, delay: 0.0, options: animationOptions,
      animations: {
        self.scrollView?.setInsetsFromKeyboardHeight(keyboardHeight)
      },
      completion: { finished in
        self.animationInProgress = false
      })
  }

  @objc private func keyboardWillHide(_ notification: Notification) {
    if measurerHasObserver {
      measurer.removeObserver(self, forKeyPath: "center")
      measurerHasObserver = false
    }
    keyboardLayoutGuide.followsUndockedKeyboard = false
    updateInsets(notification, closing: true)
  }

  @objc override public func observeValue(
    forKeyPath keyPath: String?,
    of object: Any?,
    change: [NSKeyValueChangeKey: Any]?,
    context _: UnsafeMutableRawPointer?
  ) {
    if keyPath == "center", object as? NSObject == measurer {
      if animationInProgress {
        return
      }
      self.scrollView?.setInsetsFromKeyboardHeight(measurer.frame.height)
    }
  }

#if RCT_NEW_ARCH_ENABLED
  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    // FIXME: Use a nativeID to find the ScrollView
    if index == 0 {
      scrollView = ScrollViewWrapper(view: childComponentView)
    }
    container.insertSubview(childComponentView, at: index)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    if childComponentView === scrollView?.view() {
      scrollView = nil
    }
    childComponentView.removeFromSuperview()
  }
#else
  override func insertReactSubview(_ subview: UIView!, at index: Int) {
    super.insertReactSubview(subview, at: index)

    // FIXME: Use a nativeID to find the ScrollView
    if index == 0 {
      scrollView = ScrollViewWrapper(view: subview)
    }
    container.insertSubview(subview, at: index)
  }

  override func removeReactSubview(_ subview: UIView!) {
    super.removeReactSubview(subview)

    if subview === scrollView?.view() {
      scrollView = nil
    }
    subview.removeFromSuperview()
  }

  override func didUpdateReactSubviews() {
    // no-op
  }
#endif
}
